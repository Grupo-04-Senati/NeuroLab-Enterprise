import { useMemo } from 'react';
import type { Actor, TrainingJob } from '@/types/domain';
import { familyMeta } from '@/lib/nav';
import { formatCountdown, formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip, StatusChip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/Progress';
import { Icon } from '@/components/ui/Icon';
import { PRIORITY_LABEL, PRIORITY_RANK, can, maxPriorityFor, shortName } from '@/features/training/model';
import type { QueuePriority, RunRecord } from '@/features/training/model';

/* §6 M06 · cola y prioridad por permisos, con las acciones de ciclo de vida.
   Seleccionar una fila mueve el panel de progreso: la cola y el detalle son la misma vista. */

interface QueuePanelProps {
  actor: Actor;
  jobs: TrainingJob[];
  recordOf: (job: TrainingJob) => RunRecord;
  selectedId: string;
  freeWorkers: number;
  capacity: number;
  pendingCancellation: string | null;
  onSelect: (jobId: string) => void;
  onStart: (job: TrainingJob) => void;
  onCancel: (job: TrainingJob) => void;
  onPriority: (job: TrainingJob, priority: QueuePriority) => void;
}

function remaining(job: TrainingJob): number | null {
  if (job.epoch <= 0) return null;
  const perEpoch = job.durationSeconds / job.epoch;
  if (!Number.isFinite(perEpoch) || perEpoch <= 0) return null;
  return Math.max(0, (job.epochs - job.epoch) * perEpoch);
}

export function QueuePanel({
  actor,
  jobs,
  recordOf,
  selectedId,
  freeWorkers,
  capacity,
  pendingCancellation,
  onSelect,
  onStart,
  onCancel,
  onPriority,
}: QueuePanelProps) {
  const me = shortName(actor.displayName);
  const queue = useMemo(() => {
    const active = jobs.filter((job) => job.status !== 'COMPLETED' && job.status !== 'FAILED' && job.status !== 'CANCELLED');
    return [...active].sort((a, b) => {
      const running = Number(b.status === 'RUNNING') - Number(a.status === 'RUNNING');
      if (running !== 0) return running;
      const preparing = Number(b.status === 'PREPARING') - Number(a.status === 'PREPARING');
      if (preparing !== 0) return preparing;
      const byPriority = PRIORITY_RANK[recordOf(a).priority] - PRIORITY_RANK[recordOf(b).priority];
      if (byPriority !== 0) return byPriority;
      return Date.parse(a.queuedAt) - Date.parse(b.queuedAt);
    });
  }, [jobs, recordOf]);

  const waiting = queue.filter((job) => job.status === 'QUEUED').length;

  return (
    <Panel
      title="Cola de entrenamientos"
      subtitle="El scheduler despacha por prioridad y, a igualdad de prioridad, por orden de llegada. La consola muestra el mismo orden que aplica."
      icon="queue"
      body="tight"
      actions={
        <>
          <Chip tone={freeWorkers > 0 ? 'completed' : 'preparing'}>
            <Icon name="server" size={12} />
            {freeWorkers}/{capacity} workers libres
          </Chip>
          <Chip tone="neutral" dot pulse={waiting > 0}>
            {waiting} en espera
          </Chip>
        </>
      }
    >
      {queue.length === 0 ? (
        <div className="empty">
          <Icon name="queue" />
          <h3>Cola vacía</h3>
          <p>Encole una ejecución en el panel de configuración; aparecerá aquí con su posición y su worker asignado.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table tr-queue">
            <caption className="u-sr-only">
              Trabajos activos y en espera, con prioridad asignada y acciones disponibles según el rol
            </caption>
            <thead>
              <tr>
                <th scope="col">Pos.</th>
                <th scope="col">Trabajo</th>
                <th scope="col">Estado</th>
                <th scope="col">Prioridad</th>
                <th scope="col">Avance</th>
                <th scope="col" className="is-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {queue.map((job, index) => {
                const record = recordOf(job);
                const mine = job.owner === me;
                const local = record.origin === 'local';
                const editablePriority = local && job.status === 'QUEUED' && can(actor, 'priorizar', { mine });
                const clock = remaining(job);
                const selectable = selectedId === job.id;
                return (
                  <tr key={job.id} data-selected={selectable || undefined} data-status={job.status.toLowerCase()}>
                    <td data-label="Posición" className="u-num tr-queue__pos">
                      {job.status === 'QUEUED' ? index + 1 : <Icon name="zap" size={13} />}
                    </td>

                    <td data-label="Trabajo">
                      <button
                        type="button"
                        className="table__name tr-queue__pick"
                        onClick={() => onSelect(job.id)}
                        aria-pressed={selectable}
                        title={`Ver el progreso de ${job.id} en el panel lateral`}
                      >
                        <span className="run__glyph" data-family={job.family} aria-hidden="true">
                          {familyMeta[job.family].glyph}
                        </span>
                        <span className="tr-queue__text">
                          <strong className="u-truncate">{job.project}</strong>
                          <span className="table__sub u-truncate">
                            <span className="u-mono">{job.id}</span> · {job.architectureName} · {job.owner}
                          </span>
                        </span>
                      </button>
                    </td>

                    <td data-label="Estado">
                      <StatusChip status={job.status} />
                      {job.cancelRequested && job.status !== 'CANCELLED' ? (
                        <p className="tr-queue__flag">
                          <Icon name="clock" size={11} />
                          Cancelación en curso
                        </p>
                      ) : null}
                    </td>

                    <td data-label="Prioridad">
                      {editablePriority ? (
                        <>
                          <label className="u-sr-only" htmlFor={`prio-${job.id}`}>
                            Prioridad de {job.id}
                          </label>
                          <select
                            id={`prio-${job.id}`}
                            className="tr-input tr-input--mini"
                            value={record.priority}
                            onChange={(event) => onPriority(job, event.target.value as QueuePriority)}
                          >
                            {(Object.keys(PRIORITY_LABEL) as QueuePriority[]).map((key) => (
                              <option key={key} value={key} disabled={PRIORITY_RANK[key] < PRIORITY_RANK[maxPriorityFor(actor)]}>
                                {PRIORITY_LABEL[key]}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <Chip
                          tone="outline"
                          title={
                            local
                              ? 'Su rol no permite reasignar esta prioridad.'
                              : 'Prioridad fijada por el scheduler de la API; la consola es de sólo lectura.'
                          }
                        >
                          {PRIORITY_LABEL[record.priority]}
                        </Chip>
                      )}
                    </td>

                    <td data-label="Avance">
                      {job.status === 'RUNNING' ? (
                        <div className="tr-queue__progress">
                          <ProgressBar
                            value={job.progress}
                            status={job.status}
                            label={`Época ${job.epoch} de ${job.epochs}`}
                            aside={clock !== null ? `${formatCountdown(clock)}` : undefined}
                            striped
                          />
                        </div>
                      ) : job.status === 'PREPARING' ? (
                        <p className="tr-queue__note">
                          <Icon name="clock" size={12} />
                          Validando dataset y compilando grafo
                        </p>
                      ) : (
                        <p className="tr-queue__note">
                          <Icon name="queue" size={12} />
                          En espera desde {formatRelativeTime(job.queuedAt)}
                        </p>
                      )}
                    </td>

                    <td data-label="Acciones" className="is-right">
                      <div className="tr-queue__actions">
                        {job.status === 'QUEUED' ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => onStart(job)}
                            disabled={!local || !can(actor, 'adelantar', { mine })}
                            title={
                              !local
                                ? 'El despacho de la API lo decide el scheduler.'
                                : can(actor, 'adelantar', { mine })
                                  ? 'Asignar un worker sin esperar turno'
                                  : 'Iniciar sin turno un trabajo ajeno es sólo de administración.'
                            }
                          >
                            <Icon name="zap" size={13} />
                            Iniciar
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="btn btn--ghost btn--sm tr-queue__cancel"
                          onClick={() => onCancel(job)}
                          disabled={job.cancelRequested || pendingCancellation === job.id}
                          aria-label={`Solicitar cancelación de ${job.id}`}
                        >
                          <Icon name="close" size={13} />
                          {pendingCancellation === job.id ? 'Enviando…' : 'Cancelar'}
                        </button>

                        <button
                          type="button"
                          className="btn btn--ghost btn--sm btn--icon"
                          onClick={() => onSelect(job.id)}
                          title="Abrir en el panel de progreso"
                          aria-label={`Ver ${job.id} en el panel de progreso`}
                        >
                          <Icon name="arrowRight" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
