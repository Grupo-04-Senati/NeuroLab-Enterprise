import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingJob } from '@/types/domain';
import { statusMeta } from '@/lib/nav';
import { formatRelativeTime } from '@/lib/format';
import { dataSource } from '@/lib/api/dashboard';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { LaunchPanel } from '@/features/training/LaunchPanel';
import { QueuePanel } from '@/features/training/QueuePanel';
import { RunDetail } from '@/features/training/RunDetail';
import { HistoryTable } from '@/features/training/HistoryTable';
import { PermissionsPanel } from '@/features/training/PermissionsPanel';
import { CancelDialog } from '@/features/training/CancelDialog';
import { useTrainingRuns } from '@/features/training/useTrainingRuns';
import { EMPTY_LAUNCH, isActive } from '@/features/training/model';
import type { LaunchOutcome, LaunchValues, QueuePriority } from '@/features/training/model';

/* M06 · Entrenamientos. La configuración, la cola, el progreso y el historial comparten
   un mismo estado: encolar desde cualquier punto recorre el módulo completo. */

export function TrainingPage() {
  const run = useTrainingRuns();
  const [values, setValues] = useState<LaunchValues>(EMPTY_LAUNCH);
  const [selected, setSelected] = useState<string>('');
  const [notice, setNotice] = useState<LaunchOutcome | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TrainingJob | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const show = useCallback((outcome: LaunchOutcome | null) => {
    setNotice(outcome);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    if (outcome) {
      noticeTimer.current = window.setTimeout(() => setNotice(null), 7_000);
    }
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  const ordered = run.jobs;
  const index = Math.max(0, ordered.findIndex((job) => job.id === selected));
  const job = ordered[index] ?? ordered[0] ?? null;
  const record = job ? run.recordOf(job) : null;

  /* Al llegar el snapshot, el panel lateral apunta al trabajo más urgente: uno en
     ejecución si existe, y si no, el primero de la cola. */
  useEffect(() => {
    if (job && job.id === selected) return;
    const running = ordered.find((item) => item.status === 'RUNNING');
    const queued = ordered.find((item) => item.status === 'QUEUED');
    const preferred = running ?? queued ?? ordered[0];
    if (preferred) setSelected(preferred.id);
  }, [job, ordered, selected]);

  const patch = useCallback((changes: Partial<LaunchValues>) => {
    setValues((current) => ({ ...current, ...changes }));
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { TOTAL: run.jobs.length, ACTIVOS: 0, EN_COLA: 0, CERRADOS: 0 };
    run.jobs.forEach((item) => {
      if (item.status === 'QUEUED') result.EN_COLA += 1;
      else if (isActive(item.status)) result.ACTIVOS += 1;
      else result.CERRADOS += 1;
    });
    return result;
  }, [run.jobs]);

  const follow = useCallback(
    (outcome: LaunchOutcome | null) => {
      show(outcome);
      if (outcome?.ok && outcome.jobId) setSelected(outcome.jobId);
    },
    [show],
  );

  const onLaunch = useCallback(() => {
    follow(run.launch(values));
  }, [follow, run, values]);

  const onRetry = useCallback(
    (target: TrainingJob) => {
      follow(run.retry(target));
    },
    [follow, run],
  );

  const onPriority = useCallback(
    (target: TrainingJob, priority: QueuePriority) => show(run.changePriority(target, priority)),
    [run, show],
  );

  const onStart = useCallback(
    (target: TrainingJob) => show(run.start(target)),
    [run, show],
  );

  return (
    <div className="dash tr">
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="training" size={14} strokeWidth={2} />
            M06 · Entrenamientos
          </p>
          <h1 className="page-head__title">Cola, ejecución e historial de entrenamientos</h1>
          <p className="page-head__lede">
            Configure épocas, tamaño de lote y optimizador; el scheduler despacha por prioridad y el worker
            publica su avance época a época. El navegador no entrena: muestra el estado que reporta la
            plataforma y solicita los cambios autorizados por su rol.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={run.refresh}>
            <Icon name="refresh" size={16} />
            Sincronizar
          </button>
          <a className="btn btn--primary" href="/projects">
            <Icon name="plus" size={16} />
            Desde un proyecto
          </a>
        </div>
      </div>

      <div className="tr-strip">
        <div className="status-grid">
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="training" size={15} />
              Trabajos registrados
            </span>
            <span className="status-line__val">{counts.TOTAL}</span>
          </div>
          <div className="status-line" data-tone={counts.ACTIVOS > 0 ? 'ok' : undefined}>
            <span className="status-line__key">
              <Icon name="zap" size={15} />
              En ciclo
            </span>
            <span className="status-line__val">{counts.ACTIVOS}</span>
          </div>
          <div className="status-line" data-tone={counts.EN_COLA > run.freeWorkers ? 'warn' : undefined}>
            <span className="status-line__key">
              <Icon name="queue" size={15} />
              En espera
            </span>
            <span className="status-line__val">{counts.EN_COLA}</span>
          </div>
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="server" size={15} />
              Workers libres
            </span>
            <span className="status-line__val">
              {run.freeWorkers} · {run.busyWorkers} ocupados
            </span>
          </div>
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="clock" size={15} />
              Origen de los datos
            </span>
            <span className="status-line__val">
              {dataSource === 'demo' ? 'Demostración' : 'API'} ·{' '}
              {run.lastUpdated ? formatRelativeTime(run.lastUpdated) : 'pendiente'}
            </span>
          </div>
        </div>

        {run.error ? (
          <div className="callout" role="alert">
            <Icon name="alertTriangle" size={18} />
            <div>
              <p>
                <strong>No fue posible leer el estado de la plataforma.</strong> {run.error}
              </p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={run.refresh}>
                <Icon name="refresh" size={14} />
                Reintentar ahora
              </button>
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="tr-notice" data-tone={notice.tone} role="status">
            <Icon name={notice.ok ? (notice.tone === 'info' ? 'clock' : 'checkCircle') : 'alertTriangle'} size={16} />
            <p>{notice.message}</p>
            <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => show(null)} aria-label="Descartar aviso">
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : null}
      </div>

      {run.status === 'loading' && run.jobs.length === 0 ? (
        <div className="dash__main">
          <div className="dash__col">
            <div className="panel">
              <div className="panel__body">
                <div className="skeleton" style={{ height: 360 }} />
              </div>
            </div>
          </div>
          <div className="dash__col">
            <div className="panel">
              <div className="panel__body">
                <div className="skeleton" style={{ height: 420 }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="dash__main tr__main">
            <div className="dash__col">
              <LaunchPanel
                actor={run.actor}
                projects={run.projects}
                values={values}
                onChange={patch}
                onLaunch={onLaunch}
              />

              <QueuePanel
                actor={run.actor}
                jobs={run.jobs}
                recordOf={run.recordOf}
                selectedId={job?.id ?? ''}
                freeWorkers={run.freeWorkers}
                capacity={run.busyWorkers + run.freeWorkers}
                pendingCancellation={run.pendingCancellation}
                onSelect={setSelected}
                onStart={onStart}
                onCancel={setCancelTarget}
                onPriority={onPriority}
              />

              <PermissionsPanel actor={run.actor} />
            </div>

            <div className="dash__col tr__side">
              <RunDetail
                job={job}
                record={record}
                actor={run.actor}
                pendingCancellation={run.pendingCancellation}
                neighbours={run.jobs.length}
                onSelectNeighbour={(direction) => {
                  const next = ordered[Math.min(ordered.length - 1, Math.max(0, index + direction))];
                  if (next) setSelected(next.id);
                }}
                onCancel={setCancelTarget}
                onRetry={onRetry}
              />

              <div className="panel tr-legend">
                <div className="panel__body">
                  <p className="u-caps">Máquina de estados RN-02</p>
                  <ul className="tr-legend__list">
                    {(Object.keys(statusMeta) as (keyof typeof statusMeta)[]).map((status) => (
                      <li key={status}>
                        <Chip tone={statusMeta[status].tone} dot>
                          {statusMeta[status].label}
                        </Chip>
                        <span>{STATUS_NOTE[status]}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="panel__note">
                    <Icon name="info" size={12} />
                    No hay transiciones directas: un trabajo cerrado no vuelve a ejecutar y el reintento
                    siempre genera un identificador nuevo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <HistoryTable
            actor={run.actor}
            jobs={run.jobs}
            recordOf={run.recordOf}
            selectedId={job?.id ?? ''}
            onSelect={setSelected}
            onRetry={onRetry}
          />
        </>
      )}

      {cancelTarget ? (
        <CancelDialog
          job={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(motivo) => {
            const outcome = run.cancel(cancelTarget, motivo);
            show(outcome);
            setCancelTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

const STATUS_NOTE: Record<string, string> = {
  QUEUED: 'Aceptado por la API y a la espera de worker.',
  PREPARING: 'Dataset montado y grafo compilado.',
  RUNNING: 'Épocas en curso; publica métricas y logs.',
  COMPLETED: 'Artefacto disponible para revisión en M08.',
  FAILED: 'Detenido por el watchdog; se conservan los logs.',
  CANCELLED: 'Confirmado por el worker tras la solicitud.',
};
