import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Actor, TrainingJob } from '@/types/domain';
import { usePlatformData } from '@/app/providers';
import { formatNumber } from '@/lib/format';
import { demoActor } from '@/lib/session';
import {
  PRIORITY_RANK,
  can,
  catalogue,
  createRun,
  estimate,
  isActive,
  isOccupying,
  loadStore,
  maxPriorityFor,
  nextJobId,
  recordFor,
  reprioritize,
  requestCancel,
  saveStore,
  schedule,
  shortName,
  startNow,
  validateLaunch,
} from '@/features/training/model';
import type {
  LaunchOutcome,
  LaunchValues,
  QueuePriority,
  RunRecord,
  RunStore,
  StoreMutation,
} from '@/features/training/model';

/* Estado compartido de M06. Reúne los trabajos que publica la API (M01) con las
   ejecuciones locales de la consola y mantiene el reloj de la cola. Ninguna de estas
   decisiones se envía al backend: el módulo es de sólo lectura sobre la plataforma. */

const TICK_MS = 1000;

function firstError(issues: Partial<Record<keyof LaunchValues, string>>): string {
  const found = Object.values(issues).find((value) => Boolean(value));
  return found ?? 'Revise la configuración antes de encolar.';
}

function useLocalRuns(capacity: number) {
  const [store, setStore] = useState<StoreMutation>(() => loadStore());
  const capacityRef = useRef(capacity);
  capacityRef.current = capacity;

  useEffect(() => {
    saveStore(store);
  }, [store]);

  /* El reloj de la consola avanza aunque la pestaña esté en segundo plano: el avance se
   * deduce del tiempo transcurrido, así que al volver no hay saltos ni estados falsos. */
  useEffect(() => {
    const tick = () => {
      setStore((current) => {
        const next = schedule(current.jobs, current.records, Date.now(), capacityRef.current);
        return next.changed ? { jobs: next.jobs, records: next.records } : current;
      });
    };
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return { store, setStore };
}

export interface TrainingModel {
  actor: Actor;
  jobs: TrainingJob[];
  /** Bitácora local de la consola; M09 la lee para reproducir trazas y semillas (RN-03). */
  records: RunStore;
  projects: ReturnType<typeof catalogue>;
  freeWorkers: number;
  busyWorkers: number;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  lastUpdated: string | null;
  pendingCancellation: string | null;
  refresh: () => void;
  recordOf: (job: TrainingJob) => RunRecord;
  launch: (values: LaunchValues) => LaunchOutcome;
  cancel: (job: TrainingJob, motivo: string) => LaunchOutcome;
  retry: (job: TrainingJob) => LaunchOutcome;
  changePriority: (job: TrainingJob, priority: QueuePriority) => LaunchOutcome;
  start: (job: TrainingJob) => LaunchOutcome;
}

export function useTrainingRuns(): TrainingModel {
  const { snapshot, status, error, lastUpdated, pendingCancellation, refresh, cancelJob } = usePlatformData();
  const actor: Actor = demoActor;
  const me = shortName(actor.displayName);

  const platformJobs = useMemo<TrainingJob[]>(() => {
    if (!snapshot) return [];
    const unique = new Map<string, TrainingJob>();
    [...snapshot.queuedJobs, ...snapshot.activeJobs, ...snapshot.recentJobs].forEach((job) => {
      unique.set(job.id, job);
    });
    return [...unique.values()];
  }, [snapshot]);

  const busyWorkers = platformJobs.filter((job) => isOccupying(job.status)).length;
  const capacity = Math.max(1, (snapshot?.health.workersOnline ?? 0) - busyWorkers);

  const { store, setStore } = useLocalRuns(capacity);
  const localBusy = store.jobs.filter((job) => isOccupying(job.status)).length;

  const jobs = useMemo<TrainingJob[]>(
    () =>
      [...platformJobs, ...store.jobs].sort((a, b) => {
        const byActivity = Number(isActive(b.status)) - Number(isActive(a.status));
        if (byActivity !== 0) return byActivity;
        return Date.parse(b.queuedAt) - Date.parse(a.queuedAt);
      }),
    [platformJobs, store.jobs],
  );

  /* Catálogo = proyectos que M01 destaca más todo proyecto con trabajos registrados:
     así el formulario ofrece las combinaciones que el backend ya validó (§10). */
  const projects = useMemo(() => {
    const known = new Map<string, string>();
    (snapshot?.topProjects ?? []).forEach((project) => known.set(project.id, project.name));
    jobs.forEach((job) => {
      if (!known.has(job.projectId)) known.set(job.projectId, job.project);
    });
    return catalogue(jobs, [...known].map(([id, name]) => ({ id, name })));
  }, [jobs, snapshot]);

  const recordOf = useCallback((job: TrainingJob) => recordFor(job, store.records), [store.records]);

  const enqueue = useCallback(
    (values: LaunchValues, retryOf?: string): LaunchOutcome => {
      const issues = validateLaunch(values, actor);
      if (Object.keys(issues.errors).length > 0) {
        return { ok: false, tone: 'danger', message: firstError(issues.errors) };
      }
      if (!can(actor, 'lanzar')) {
        return { ok: false, tone: 'danger', message: 'Su rol no permite encolar entrenamientos; solicite el acceso en M10.' };
      }
      const project = projects.find((item) => item.id === values.projectId);
      if (!project) return { ok: false, tone: 'danger', message: 'El proyecto seleccionado no está disponible.' };

      const created = createRun(values, {
        actor,
        project,
        now: Date.now(),
        nextId: nextJobId(jobs),
        retryOf,
      });
      setStore((current) => ({
        jobs: [...current.jobs, created.job],
        records: { ...current.records, [created.job.id]: created.record },
      }));

      const ritmo = estimate(created.job.family, created.job.batch, created.job.epochs);
      return {
        ok: true,
        tone: 'success',
        jobId: created.job.id,
        message: `${created.job.id} encolado · ${created.job.epochs} épocas · ${formatNumber(ritmo.epochSeconds, 1)}\u00a0s por época${retryOf ? ` · reintento de ${retryOf}` : ''}.`,
      };
    },
    [actor, jobs, projects, setStore],
  );

  const launch = useCallback((values: LaunchValues) => enqueue(values), [enqueue]);

  /** Copia los parámetros de un trabajo para volver a encolarlos como ejecución nueva (§10). */
  const valuesFrom = useCallback(
    (job: TrainingJob): LaunchValues => {
      const record = recordFor(job, store.records);
      return {
        projectId: job.projectId,
        architecture: job.architectureName,
        dataset: job.datasetName,
        epochs: String(job.epochs),
        batch: String(job.batch),
        optimizer: job.optimizer,
        learningRate: String(record.learningRate).replace('.', ','),
        seed: String(record.seed),
        priority: record.priority,
      };
    },
    [store.records],
  );

  const cancel = useCallback(
    (job: TrainingJob, motivo: string): LaunchOutcome => {
      if (!isActive(job.status)) {
        return { ok: false, tone: 'danger', message: `${job.id} ya terminó; no hay nada que cancelar (RN-02).` };
      }
      if (!can(actor, 'cancelar', { mine: job.owner === me })) {
        return { ok: false, tone: 'danger', message: 'Sólo administración o la responsabilidad del proyecto puede cancelar este trabajo.' };
      }
      if (recordFor(job, store.records).origin === 'plataforma') {
        cancelJob(job.id);
        return { ok: true, tone: 'info', message: `Cancelación de ${job.id} solicitada; el worker confirma el estado final (RN-05).` };
      }
      setStore((current) => requestCancel(current, job, { motivo, now: Date.now() }));
      return { ok: true, tone: 'info', message: `Cancelación de ${job.id} registrada con motivo; pendiente de confirmación del worker.` };
    },
    [actor, cancelJob, me, setStore, store.records],
  );

  const retry = useCallback(
    (job: TrainingJob): LaunchOutcome => {
      if (isActive(job.status)) {
        return { ok: false, tone: 'danger', message: `${job.id} sigue activo; cancele antes de reintentar (RN-02).` };
      }
      if (!can(actor, 'reintentar', { mine: job.owner === me })) {
        return { ok: false, tone: 'danger', message: 'Su rol no permite reintentar trabajos ajenos.' };
      }
      const project = projects.find((item) => item.id === job.projectId);
      if (!project?.architectures.some((item) => item.name === job.architectureName)) {
        return {
          ok: false,
          tone: 'danger',
          message: `${job.architectureName} ya no está validada en ${job.project}; recrearla en M04.`,
        };
      }
      return enqueue(valuesFrom(job), job.id);
    },
    [actor, enqueue, me, projects, valuesFrom],
  );

  const changePriority = useCallback(
    (job: TrainingJob, priority: QueuePriority): LaunchOutcome => {
      if (recordFor(job, store.records).origin !== 'local') {
        return {
          ok: false,
          tone: 'danger',
          message: 'El orden de los trabajos de la API lo decide el scheduler; la consola sólo solicita cancelación.',
        };
      }
      if (!can(actor, 'priorizar', { mine: job.owner === me })) {
        return { ok: false, tone: 'danger', message: 'Reasignar la prioridad de un trabajo ajeno corresponde a la responsabilidad del proyecto.' };
      }
      if (PRIORITY_RANK[priority] < PRIORITY_RANK[maxPriorityFor(actor)]) {
        return { ok: false, tone: 'danger', message: `Su rol no permite la prioridad ${priority}.` };
      }
      setStore((current) => reprioritize(current, job, priority, Date.now()));
      return { ok: true, tone: 'info', message: `${job.id} pasa a prioridad ${priority}.` };
    },
    [actor, me, setStore, store.records],
  );

  const start = useCallback(
    (job: TrainingJob): LaunchOutcome => {
      if (job.status !== 'QUEUED') {
        return { ok: false, tone: 'danger', message: 'Sólo se inicia un trabajo que aún está en cola.' };
      }
      if (recordFor(job, store.records).origin !== 'local') {
        return { ok: false, tone: 'danger', message: 'El despacho de los trabajos de la API lo decide el scheduler.' };
      }
      if (!can(actor, 'adelantar', { mine: job.owner === me })) {
        return { ok: false, tone: 'danger', message: 'Iniciar sin turno un trabajo ajeno está reservado a administración.' };
      }
      setStore((current) => startNow(current, job, Date.now()));
      return { ok: true, tone: 'info', message: `${job.id} asignado a worker sin esperar turno.` };
    },
    [actor, me, setStore, store.records],
  );

  return {
    actor,
    jobs,
    records: store.records,
    projects,
    freeWorkers: Math.max(0, capacity - localBusy),
    busyWorkers,
    status,
    error,
    lastUpdated,
    pendingCancellation,
    refresh,
    recordOf,
    launch,
    cancel,
    retry,
    changePriority,
    start,
  };
}

export type { LaunchOutcome, QueuePriority, RunRecord, RunStore };
