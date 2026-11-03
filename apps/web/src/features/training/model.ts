import type {
  Actor,
  EpochPoint,
  JobStatus,
  NetworkFamily,
  TrainingJob,
  UserRole,
} from '@/types/domain';

/* Modelo de M06 · Entrenamientos (§6 Documento Maestro).
   - Configuración de épocas, batch size y optimizador.
   - Cola y prioridad por permisos.
   - Inicio, cancelación y reintento.
   - Progreso en tiempo real.

   Los trabajos ya registrados por la plataforma (`origin: 'plataforma'`) llegan por el
   snapshot de M01 y son de sólo lectura salvo la cancelación, que es una solicitud que el
   worker confirma (RN-05). Las ejecuciones creadas aquí viven en `origin: 'local'` y avanzan
   con reloj de pared, igual que hace el worker con los suyos. Ningún cálculo de red neuronal
   ocurre en el navegador (RN-03): sólo se simula el ciclo de vida y se dibuja lo publicado. */

export type RunOrigin = 'plataforma' | 'local';
export type QueuePriority = 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAJA';
export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface RunLog {
  at: number;
  level: LogLevel;
  /** Emisor de la línea: api, scheduler, worker, watchdog o registry. */
  source: string;
  text: string;
}

export interface RunRecord {
  jobId: string;
  origin: RunOrigin;
  version: string;
  priority: QueuePriority;
  learningRate: number;
  seed: number;
  owner: string;
  /** Segundos por época fijados al encolarse: el ritmo no cambia al recargar la página. */
  epochSeconds?: number;
  /** Identificador del trabajo del que nace esta ejecución, si es un reintento. */
  retryOf?: string;
  /** Momento en que se solicitó la cancelación; el worker la confirma después. */
  cancelRequestedAt?: number;
  motivo?: string;
  logs: RunLog[];
  /** Historial época a época; sólo se llena en ejecuciones locales. */
  metrics: EpochPoint[];
}

export type RunStore = Record<string, RunRecord>;

export interface ProjectOption {
  id: string;
  name: string;
  architectures: { name: string; family: NetworkFamily }[];
  datasets: string[];
}

export interface LaunchValues {
  projectId: string;
  architecture: string;
  dataset: string;
  epochs: string;
  batch: string;
  optimizer: string;
  learningRate: string;
  seed: string;
  priority: QueuePriority;
}

export const EMPTY_LAUNCH: LaunchValues = {
  projectId: '',
  architecture: '',
  dataset: '',
  epochs: '60',
  batch: '64',
  optimizer: 'adam',
  learningRate: '0,001',
  seed: '2026',
  priority: 'NORMAL',
};

export const PRIORITY_LABEL: Record<QueuePriority, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  NORMAL: 'Normal',
  BAJA: 'Baja',
};

/** Menor rango se despacha antes. */
export const PRIORITY_RANK: Record<QueuePriority, number> = {
  CRITICA: 0,
  ALTA: 1,
  NORMAL: 2,
  BAJA: 3,
};

export const OPTIMIZERS: { id: string; label: string; hint: string }[] = [
  { id: 'adam', label: 'Adam', hint: 'Converge rápido y tolera tasas moderadas; opción por defecto.' },
  { id: 'adamw', label: 'AdamW', hint: 'Adam con decaimiento de peso desacoplado, estable en redes profundas.' },
  { id: 'rmsprop', label: 'RMSprop', hint: 'Buena inercia en secuencias recurrentes largas.' },
  { id: 'sgd', label: 'SGD', hint: 'Sensible a la tasa: exige ajuste fino y buenas semillas.' },
];

/** Límites operativos del clúster; en producción los fija la configuración de M10. */
export const LIMITS = {
  epochs: { min: 1, max: 500 },
  batch: { min: 1, max: 1024 },
  learningRate: { min: 0.000_001, max: 1 },
  /** Horas de GPU por trabajo antes de que el scheduler lo corte. */
  maxGpuHours: 24,
};

const PREPARE_MS = 12_000;
const CANCEL_CONFIRM_MS = 6_000;
const LOG_CAP = 60;
/** Segundos de simulación por época según la familia; el lote los escala. */
const FAMILY_EPOCH_SECONDS: Record<NetworkFamily, number> = {
  FEEDFORWARD: 1.6,
  RNN: 3.2,
  CNN: 4.4,
  GAN: 6.1,
};

export const STORAGE_KEY = 'neurolab.training.v1';

/* --------------------------------------------------------------------- permisos */

export type TrainingPermission = 'lanzar' | 'priorizar' | 'adelantar' | 'cancelar' | 'reintentar';

const PERMISSIONS: Record<TrainingPermission, { roles: UserRole[]; note: string }> = {
  lanzar: {
    roles: ['admin', 'owner', 'engineer'],
    note: 'Requiere proyecto, arquitectura y dataset validados (§10).',
  },
  priorizar: {
    roles: ['admin', 'owner'],
    note: 'Reasignar prioridad a un trabajo ajeno corresponde a la responsabilidad del proyecto.',
  },
  adelantar: {
    roles: ['admin'],
    note: 'Forzar el inicio de un trabajo ajeno salta el orden de la cola; sólo administración.',
  },
  cancelar: {
    roles: ['admin', 'owner', 'engineer'],
    note: 'Es una solicitud: el worker confirma el estado final y registra el motivo (RN-05).',
  },
  reintentar: {
    roles: ['admin', 'owner', 'engineer'],
    note: 'El reintento crea un trabajo nuevo y conserva la trazabilidad del original.',
  },
};

const PERMISSION_LABEL: Record<TrainingPermission, string> = {
  lanzar: 'Encolar ejecución',
  priorizar: 'Cambiar prioridad',
  adelantar: 'Iniciar sin esperar turno',
  cancelar: 'Solicitar cancelación',
  reintentar: 'Reintentar',
};

export const PERMISSION_ROWS = (Object.keys(PERMISSIONS) as TrainingPermission[]).map((id) => ({
  id,
  label: PERMISSION_LABEL[id],
  roles: PERMISSIONS[id].roles,
  note: PERMISSIONS[id].note,
}));

/** Forma corta del nombre, la que usan los registros de auditoría: "Ana Quispe Ramos" → "A. Quispe". */
export function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts.length < 2 ? displayName : `${parts[0].slice(0, 1)}. ${parts[1]}`;
}

/** Un dueño siempre opera sobre sus propios trabajos; los ajenos siguen la matriz. */
const SELF_ALLOWED: TrainingPermission[] = ['cancelar', 'reintentar', 'adelantar'];

export function can(
  actor: Actor,
  permission: TrainingPermission,
  options: { mine?: boolean } = {},
): boolean {
  if (options.mine && SELF_ALLOWED.includes(permission)) return true;
  return PERMISSIONS[permission].roles.includes(actor.role);
}

export function maxPriorityFor(actor: Actor): QueuePriority {
  if (actor.role === 'admin' || actor.role === 'owner') return 'CRITICA';
  if (actor.role === 'engineer') return 'ALTA';
  return 'NORMAL';
}

/* ------------------------------------------------------------------- catálogo */

/**
 * El catálogo se deriva de los trabajos que la API ya registró: son las combinaciones de
 * proyecto, arquitectura y dataset que el backend validó alguna vez. Un proyecto sin
 * historial queda vacío y el formulario obliga a pasar antes por M04 y M05 (§10).
 */
export function catalogue(
  jobs: TrainingJob[],
  projects: { id: string; name: string }[],
): ProjectOption[] {
  return projects.map((project) => {
    const own = jobs.filter((job) => job.projectId === project.id);
    const architectures = new Map<string, NetworkFamily>();
    const datasets = new Set<string>();
    own.forEach((job) => {
      architectures.set(job.architectureName, job.family);
      datasets.add(job.datasetName);
    });
    return {
      id: project.id,
      name: project.name,
      architectures: [...architectures].map(([name, family]) => ({ name, family })),
      datasets: [...datasets],
    };
  });
}

/** Versión del artefacto: el sufijo `vN` de la arquitectura es la que registra M08. */
export function versionFor(architectureName: string): string {
  const match = /v(\d+(?:\.\d+)?)/i.exec(architectureName);
  return match ? `v${match[1]}` : 'v1';
}

/* ------------------------------------------------------------------ validación */

export interface LaunchIssues {
  errors: Partial<Record<keyof LaunchValues, string>>;
  warnings: Partial<Record<keyof LaunchValues, string>>;
}

export function toNumber(raw: string): number {
  return Number(raw.replace(',', '.'));
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function validateLaunch(values: LaunchValues, actor: Actor): LaunchIssues {
  const errors: LaunchIssues['errors'] = {};
  const warnings: LaunchIssues['warnings'] = {};

  if (!values.projectId) errors.projectId = 'Seleccione el proyecto dueño de la ejecución (§10).';
  if (!values.architecture) errors.architecture = 'Sin arquitectura validada no hay grafo que compilar: críela en M04.';
  if (!values.dataset) errors.dataset = 'Indique el dataset de entrenamiento y validación; se registra en M05.';

  const epochs = toNumber(values.epochs);
  if (!values.epochs.trim()) errors.epochs = 'Las épocas son obligatorias.';
  else if (!Number.isFinite(epochs) || !Number.isInteger(epochs)) errors.epochs = 'Use un número entero de épocas.';
  else if (epochs < LIMITS.epochs.min) errors.epochs = `Mínimo ${LIMITS.epochs.min} época.`;
  else if (epochs > LIMITS.epochs.max) errors.epochs = `El límite por trabajo es ${LIMITS.epochs.max} épocas.`;

  const batch = toNumber(values.batch);
  if (!values.batch.trim()) errors.batch = 'El tamaño de lote es obligatorio.';
  else if (!Number.isFinite(batch) || !Number.isInteger(batch)) errors.batch = 'Use un número entero de muestras por lote.';
  else if (batch < LIMITS.batch.min || batch > LIMITS.batch.max) {
    errors.batch = `El lote debe estar entre ${LIMITS.batch.min} y ${LIMITS.batch.max}.`;
  } else if (!isPowerOfTwo(batch)) {
    warnings.batch = 'Los lotes de tamaño binario aprovechan mejor la memoria de la GPU.';
  }

  const rate = toNumber(values.learningRate);
  if (!values.learningRate.trim()) errors.learningRate = 'La tasa de aprendizaje es obligatoria.';
  else if (!Number.isFinite(rate) || rate <= 0) errors.learningRate = 'Use un valor positivo.';
  else if (rate > LIMITS.learningRate.max) errors.learningRate = `Máximo ${LIMITS.learningRate.max}.`;
  else if (values.optimizer === 'sgd' && rate > 0.05) {
    warnings.learningRate =
      'SGD con una tasa tan alta suele hacer explotar los gradientes; el watchdog numérico detendrá el trabajo.';
  }

  const seed = toNumber(values.seed);
  if (!values.seed.trim()) errors.seed = 'La semilla es obligatoria para reproducir la ejecución.';
  else if (!Number.isInteger(seed) || seed < 0) errors.seed = 'Use un entero mayor o igual que 0.';

  if (PRIORITY_RANK[values.priority] < PRIORITY_RANK[maxPriorityFor(actor)]) {
    errors.priority = `Su rol permite como máximo prioridad ${PRIORITY_LABEL[maxPriorityFor(actor)]}.`;
  }

  return { errors, warnings };
}

/* ------------------------------------------------------------------- estimación */

export interface Estimate {
  epochSeconds: number;
  totalSeconds: number;
  gpuHours: number;
  overLimit: boolean;
}

export function estimate(family: NetworkFamily, batch: number, epochs: number): Estimate {
  const scale = Math.pow(Math.max(1, batch) / 64, 0.45);
  const epochSeconds = Math.max(1.2, Math.round(FAMILY_EPOCH_SECONDS[family] * scale * 10) / 10);
  const totalSeconds = epochSeconds * Math.max(1, epochs);
  const gpuHours = totalSeconds / 3600;
  return { epochSeconds, totalSeconds, gpuHours, overLimit: gpuHours > LIMITS.maxGpuHours };
}

/* ------------------------------------------------------ avance determinista del run */

function random(seed: string): () => number {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t >>> 7, t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Convergencia simulada: la pérdida decae y la exactitud crece hacia sus asíntotas. */
function metricAt(jobId: string, epochs: number, epoch: number, diverging: boolean): EpochPoint {
  const rand = random(`${jobId}:${epoch}`);
  const t = epochs > 0 ? (epoch + 1) / epochs : 0;
  const decay = Math.exp(-3.4 * t);
  const noise = (rand() - 0.5) * 0.022 * decay;
  const baseLoss = 0.6931;
  const finalLoss = diverging ? 0.6882 : 0.1401;
  const baseAccuracy = diverging ? 0.505 : 0.512;
  const finalAccuracy = diverging ? 0.5118 : 0.9334;
  const loss = Math.max(finalLoss, (baseLoss - finalLoss) * decay + finalLoss + noise);
  const accuracy = Math.min(
    finalAccuracy,
    finalAccuracy - (finalAccuracy - baseAccuracy) * decay + noise * 0.9,
  );
  return {
    epoch: epoch + 1,
    loss,
    valLoss: loss * (1.04 + rand() * 0.05),
    accuracy,
    valAccuracy: Math.max(0.35, accuracy - 0.008 - rand() * 0.012),
  };
}

function line(level: LogLevel, source: string, text: string, at: number): RunLog {
  return { at, level, source, text };
}

/** El motivo lo escribe el usuario; se normaliza antes de embeberlo en la bitácora. */
function clean(motivo: string): string {
  return motivo.trim().replace(/[.\s]+$/u, '');
}

/** SGD con una tasa temeraria: el watchdog numérico aborta el trabajo (§12). */
function isDivergent(optimizer: string, learningRate: number): boolean {
  return optimizer === 'sgd' && learningRate > 0.05;
}

/* ---------------------------------------------------------------------- creación */

export interface LaunchContext {
  actor: Actor;
  project: ProjectOption;
  now: number;
  nextId: string;
  retryOf?: string;
}

export function createRun(
  values: LaunchValues,
  context: LaunchContext,
): { job: TrainingJob; record: RunRecord } {
  const { actor, project, now, nextId, retryOf } = context;
  const architecture = project.architectures.find((item) => item.name === values.architecture);
  const family = architecture?.family ?? 'FEEDFORWARD';
  const epochs = Math.round(toNumber(values.epochs));
  const batch = Math.round(toNumber(values.batch));
  const estimateOf = estimate(family, batch, epochs);
  const iso = new Date(now).toISOString();

  const job: TrainingJob = {
    id: nextId,
    project: project.name,
    projectId: project.id,
    architectureName: values.architecture,
    family,
    datasetName: values.dataset,
    status: 'QUEUED',
    epochs,
    epoch: 0,
    batch,
    optimizer: values.optimizer,
    loss: 0,
    accuracy: 0,
    valLoss: 0,
    valAccuracy: 0,
    progress: 0,
    queuedAt: iso,
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
    owner: shortName(actor.displayName),
    cancelRequested: false,
  };

  const record: RunRecord = {
    jobId: nextId,
    origin: 'local',
    version: versionFor(values.architecture),
    priority: values.priority,
    learningRate: toNumber(values.learningRate),
    seed: Math.round(toNumber(values.seed)),
    owner: shortName(actor.displayName),
    epochSeconds: estimateOf.epochSeconds,
    retryOf,
    logs: [
      line('info', 'api', `Solicitud aceptada; trabajo encolado con prioridad ${PRIORITY_LABEL[values.priority]}.`, now),
      line('info', 'scheduler', `Config: ${epochs} épocas · lote ${batch} · ${values.optimizer} · lr ${values.learningRate} · semilla ${values.seed}.`, now),
      line('info', 'scheduler', `Ritmo estimado ${estimateOf.epochSeconds}s por época (${Math.round(estimateOf.totalSeconds / 60)} min).`, now),
      ...(retryOf ? [line('info', 'api', `Reintento de ${retryOf}: el trabajo original y su trazabilidad se conservan.`, now)] : []),
    ],
    metrics: [],
  };

  return { job, record };
}

/* ---------------------------------------------- acciones de ciclo de vida (RN-02) */

export type OutcomeTone = 'success' | 'info' | 'danger';

/** Resultado de una acción de la consola: se muestra en la banda de avisos. */
export interface LaunchOutcome {
  ok: boolean;
  tone: OutcomeTone;
  message: string;
  /** Identificador del trabajo nuevo, cuando la acción creó uno. */
  jobId?: string;
}

export interface StoreMutation {
  jobs: TrainingJob[];
  records: RunStore;
}

function withJob(store: StoreMutation, id: string, changes: Partial<TrainingJob>): StoreMutation {
  return { ...store, jobs: store.jobs.map((job) => (job.id === id ? { ...job, ...changes } : job)) };
}

function withRecord(store: StoreMutation, id: string, changes: Partial<RunRecord>): StoreMutation {
  const current = store.records[id];
  if (!current) return store;
  return { ...store, records: { ...store.records, [id]: { ...current, ...changes } } };
}

function appendLog(store: StoreMutation, id: string, entry: RunLog): StoreMutation {
  const current = store.records[id];
  if (!current) return store;
  return withRecord(store, id, { logs: [...current.logs, entry].slice(-LOG_CAP) });
}

/** La cancelación es una solicitud: el worker la confirma al cerrar la época (RN-05). */
export function requestCancel(
  store: StoreMutation,
  job: TrainingJob,
  options: { motivo: string; now: number },
): StoreMutation {
  const { motivo, now } = options;
  const requested: StoreMutation = {
    jobs: store.jobs.map((item) => (item.id === job.id ? { ...item, cancelRequested: true } : item)),
    records: store.records,
  };
  const next = withRecord(requested, job.id, { cancelRequestedAt: now, motivo: motivo.trim() });
  return appendLog(next, job.id, line('warn', 'api', `Cancelación solicitada: ${clean(motivo)}. Pendiente de confirmación del worker.`, now));
}

export function reprioritize(
  store: StoreMutation,
  job: TrainingJob,
  priority: QueuePriority,
  now: number,
): StoreMutation {
  const next = withRecord(store, job.id, { priority });
  return appendLog(next, job.id, line('info', 'scheduler', `Prioridad cambiada a ${PRIORITY_LABEL[priority]}.`, now));
}

/** Inicio: ocupa un worker sin esperar turno y marca el trabajo como crítico (RN-02). */
export function startNow(store: StoreMutation, job: TrainingJob, now: number): StoreMutation {
  const prepared = withJob(store, job.id, {
    status: 'PREPARING',
    startedAt: new Date(now).toISOString(),
    progress: 0,
  });
  const promoted = withRecord(prepared, job.id, { priority: 'CRITICA' });
  return appendLog(
    promoted,
    job.id,
    line('info', 'scheduler', 'Inicio forzado desde la consola: asignado a worker sin esperar turno.', now),
  );
}

/* -------------------------------------------------------------------- despacho */

export interface ScheduleResult extends StoreMutation {
  changed: boolean;
}

/**
 * Mueve el reloj de las ejecuciones locales: cola → preparación → ejecución → estado final.
 * `capacity` es el número de workers libres que informa M01.
 */
export function schedule(
  jobs: TrainingJob[],
  records: RunStore,
  now: number,
  capacity: number,
): ScheduleResult {
  const ids = jobs.filter((job) => records[job.id]?.origin === 'local').map((job) => job.id);
  if (ids.length === 0) return { jobs, records, changed: false };

  let store: StoreMutation = { jobs, records };
  const changedIds = new Set<string>();
  const touch = (id: string) => changedIds.add(id);

  const jobOf = (id: string) => store.jobs.find((job) => job.id === id)!;
  const setJob = (id: string, changes: Partial<TrainingJob>) => {
    store = withJob(store, id, changes);
    touch(id);
  };
  const log = (id: string, entry: RunLog) => {
    store = appendLog(store, id, entry);
  };

  /* 1. Cancelaciones solicitadas: el worker las confirma al cerrar la época (RN-05). */
  ids.forEach((id) => {
    const job = jobOf(id);
    const record = store.records[id];
    if (!job.cancelRequested || job.status === 'CANCELLED') return;
    const requested = record.cancelRequestedAt ?? Date.parse(job.queuedAt);
    if (now - requested < CANCEL_CONFIRM_MS) return;
    log(id, line('warn', 'worker', `Cancelación confirmada (${clean(record.motivo ?? 'solicitud de la consola')}). Época alcanzada: ${job.epoch}/${job.epochs}.`, now));
    setJob(id, { status: 'CANCELLED', endedAt: new Date(now).toISOString(), durationSeconds: runSeconds(job, now) });
  });

  /* 2. Preparación → ejecución. */
  ids.forEach((id) => {
    const job = jobOf(id);
    if (job.status !== 'PREPARING' || !job.startedAt) return;
    if (now - Date.parse(job.startedAt) < PREPARE_MS) return;
    const at = Date.parse(job.startedAt) + PREPARE_MS;
    log(id, line('info', 'worker', `Lotes de ${job.datasetName} montados; ciclo de ${job.epochs} épocas iniciado.`, at));
    setJob(id, { status: 'RUNNING' });
  });

  /* 3. Cola → preparación mientras haya workers libres, respetando prioridad. */
  const occupied = ids.filter((id) => ['RUNNING', 'PREPARING'].includes(jobOf(id).status)).length;
  let free = Math.max(0, capacity - occupied);

  ids
    .map(jobOf)
    .filter((job) => job.status === 'QUEUED' && !job.cancelRequested && !store.records[job.id].cancelRequestedAt)
    .sort((a, b) => {
      const byPriority = PRIORITY_RANK[store.records[a.id].priority] - PRIORITY_RANK[store.records[b.id].priority];
      return byPriority !== 0 ? byPriority : Date.parse(a.queuedAt) - Date.parse(b.queuedAt);
    })
    .forEach((job) => {
      if (free <= 0) return;
      free -= 1;
      log(job.id, line('info', 'scheduler', `Asignado a worker-${slotOf(job.id)}; validando forma de entrada y permisos del dataset.`, now));
      setJob(job.id, { status: 'PREPARING', startedAt: new Date(now).toISOString(), progress: 0 });
    });

  /* 4. Ejecución: épocas, métricas, logs y estado final. */
  ids.forEach((id) => {
    const job = jobOf(id);
    const record = store.records[id];
    if (job.status !== 'RUNNING') return;

    const perEpoch = record.epochSeconds ?? estimate(job.family, job.batch, job.epochs).epochSeconds;
    const clockStart = runningFrom(job);
    const reached = Math.floor((now - clockStart) / 1000 / perEpoch);
    if (reached <= job.epoch) return;

    const diverging = isDivergent(job.optimizer, record.learningRate);
    const stopAt = diverging ? Math.max(3, Math.ceil(job.epochs * 0.3)) : job.epochs;
    const completed = Math.min(reached, stopAt, job.epochs);
    if (completed <= job.epoch) return;

    const metrics = [...record.metrics];
    const logs: RunLog[] = [];
    for (let index = metrics.length; index < completed; index += 1) {
      const point = metricAt(job.id, job.epochs, index, diverging);
      metrics.push(point);
      logs.push(
        line(
          'info',
          'worker',
          `Época ${point.epoch}/${job.epochs} · loss ${point.loss.toFixed(4)} · val_acc ${(point.valAccuracy * 100).toFixed(1)}\u00a0%`,
          clockStart + (index + 1) * perEpoch * 1000,
        ),
      );
    }
    store = withRecord(store, id, { metrics });
    logs.forEach((entry) => log(id, entry));

    const last = metrics[metrics.length - 1];
    const failed = diverging && completed >= stopAt;
    const done = !diverging && completed >= job.epochs;

    if (failed) {
      log(id, line('error', 'watchdog', `Gradientes fuera de rango en la época ${last.epoch}: la pérdida se estancó en ${last.loss.toFixed(3)}. Trabajo detenido; logs técnicos conservados.`, now));
      setJob(id, {
        status: 'FAILED',
        epoch: last.epoch,
        progress: Math.round((last.epoch / job.epochs) * 100),
        ...metricsOf(last),
        endedAt: new Date(now).toISOString(),
        durationSeconds: Math.round((last.epoch * perEpoch * 1000) / 1000),
      });
      return;
    }

    if (done) {
      log(id, line('success', 'registry', `Ejecución completada; artefacto ${job.architectureName} (${record.version}) pendiente de revisión en M08.`, now));
      setJob(id, {
        status: 'COMPLETED',
        epoch: job.epochs,
        progress: 100,
        ...metricsOf(last),
        endedAt: new Date(now).toISOString(),
        durationSeconds: Math.round(job.epochs * perEpoch),
      });
      return;
    }

    setJob(id, {
      epoch: last.epoch,
      progress: Math.round((last.epoch / job.epochs) * 100),
      ...metricsOf(last),
      durationSeconds: Math.round((now - clockStart) / 1000),
    });
  });

  return { ...store, changed: changedIds.size > 0 };
}

/** Worker simulado estable: el mismo trabajo siempre reporta el mismo destino. */
function slotOf(jobId: string): number {
  const digits = Number(/\d+/.exec(jobId)?.[0]);
  return (Number.isFinite(digits) ? digits : 1) % 5 + 1;
}

/** Instante en que el scheduler asignó un worker; antes de eso el trabajo sólo esperó en cola. */
function dispatchAt(job: TrainingJob): number {
  return job.startedAt ? Date.parse(job.startedAt) : Date.parse(job.queuedAt);
}

/** Instante en que el worker cierra la preparación y empieza a procesar épocas. */
function runningFrom(job: TrainingJob): number {
  return dispatchAt(job) + PREPARE_MS;
}

/** Duración de cómputo: sólo el tiempo en que el worker procesó épocas. */
function runSeconds(job: TrainingJob, now: number): number {
  if (!job.startedAt) return 0;
  return Math.max(0, Math.round((now - runningFrom(job)) / 1000));
}

function metricsOf(point: EpochPoint): Pick<TrainingJob, 'loss' | 'accuracy' | 'valLoss' | 'valAccuracy'> {
  return { loss: point.loss, accuracy: point.accuracy, valLoss: point.valLoss, valAccuracy: point.valAccuracy };
}

/* ---------------------------------------------------------------- persistencia */

function isTrainingJob(value: unknown): value is TrainingJob {
  if (typeof value !== 'object' || value === null) return false;
  const job = value as Record<string, unknown>;
  return typeof job.id === 'string' && typeof job.status === 'string' && typeof job.epochs === 'number';
}

export function loadStore(): StoreMutation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { jobs: [], records: {} };
    const parsed = JSON.parse(raw) as { jobs?: unknown; records?: unknown };
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs.filter(isTrainingJob) : [];
    const records = typeof parsed.records === 'object' && parsed.records !== null ? (parsed.records as RunStore) : {};
    return { jobs, records };
  } catch {
    return { jobs: [], records: {} };
  }
}

export function saveStore(store: StoreMutation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Cuota llena o modo privado: la sesión sigue usable sin persistencia. */
  }
}

export function nextJobId(jobs: TrainingJob[]): string {
  const highest = jobs.reduce((max, job) => {
    const match = /^JOB-(\d+)$/.exec(job.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 4900);
  return `JOB-${highest + 1}`;
}

/* ------------------------------------------------------------------- lecturas UI */

/** Registros de un trabajo de plataforma, deducidos de los eventos que la API publica. */
export function platformRecord(job: TrainingJob): RunRecord {
  const queued = Date.parse(job.queuedAt);
  const started = job.startedAt ? Date.parse(job.startedAt) : null;
  const ended = job.endedAt ? Date.parse(job.endedAt) : null;
  const logs: RunLog[] = [line('info', 'api', `Trabajo encolado por ${job.owner}.`, queued)];
  if (started) logs.push(line('info', 'scheduler', `Asignado a worker; lote ${job.batch} con optimizador ${job.optimizer}.`, started));
  if (job.epoch > 0) {
    logs.push(
      line(
        'info',
        'worker',
        `Época ${job.epoch}/${job.epochs} · loss ${job.loss.toFixed(4)} · val_acc ${(job.valAccuracy * 100).toFixed(1)}\u00a0%`,
        ended ?? Date.now(),
      ),
    );
  }
  if (job.cancelRequested && !ended) {
    logs.push(line('warn', 'api', 'Cancelación solicitada; pendiente de confirmación del worker.', Date.now()));
  }
  if (ended && job.status === 'COMPLETED') {
    logs.push(line('success', 'registry', `Ejecución completada; artefacto ${job.architectureName} disponible para revisión.`, ended));
  }
  if (ended && job.status === 'FAILED') {
    logs.push(line('error', 'watchdog', `Detenido en la época ${job.epoch}: la pérdida dejó de mejorar. Logs técnicos conservados.`, ended));
  }
  if (ended && job.status === 'CANCELLED') {
    logs.push(line('warn', 'worker', `Cancelación confirmada en la época ${job.epoch}/${job.epochs}.`, ended));
  }

  return {
    jobId: job.id,
    origin: 'plataforma',
    version: versionFor(job.architectureName),
    priority: job.status === 'QUEUED' ? 'NORMAL' : 'ALTA',
    learningRate: job.optimizer === 'sgd' ? 0.01 : 0.001,
    seed: Number(/(\d+)/.exec(job.id)?.[1] ?? 0) || 0,
    owner: job.owner,
    logs,
    metrics: [],
  };
}

/** Punto de acceso único: registro propio si existe, reconstruido si viene de la API.
   El registro de plataforma se memoriza por objeto de trabajo para que la misma fila
   conserve identidad estable entre renderizados. */
const platformCache = new WeakMap<TrainingJob, RunRecord>();

export function recordFor(job: TrainingJob, records: RunStore): RunRecord {
  const own = records[job.id];
  if (own) return own;
  const cached = platformCache.get(job);
  if (cached) return cached;
  const built = platformRecord(job);
  platformCache.set(job, built);
  return built;
}

/** Estados que aún no han cerrado (RN-02). */
export function isActive(status: JobStatus): boolean {
  return status === 'QUEUED' || status === 'PREPARING' || status === 'RUNNING';
}

/** Sólo estos ocupan un worker del clúster; en cola no consume capacidad. */
export function isOccupying(status: JobStatus): boolean {
  return status === 'PREPARING' || status === 'RUNNING';
}
