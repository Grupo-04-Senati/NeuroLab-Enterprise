import type { TrainingJob } from '@/types/domain';
import { familyMeta } from '@/lib/nav';
import { formatCountdown, formatDuration, formatLoss, formatRate, formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip, StatusChip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/Progress';
import { Icon } from '@/components/ui/Icon';

function estimateSeconds(job: TrainingJob): number | null {
  if (job.epoch <= 0) return null;
  const perEpoch = job.durationSeconds / job.epoch;
  if (!Number.isFinite(perEpoch) || perEpoch <= 0) return null;
  return Math.max(0, (job.epochs - job.epoch) * perEpoch);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
    </div>
  );
}

function ActiveRow({
  job,
  busy,
  onCancel,
}: {
  job: TrainingJob;
  busy: boolean;
  onCancel: (jobId: string) => void;
}) {
  const remaining = estimateSeconds(job);

  return (
    <li className="run">
      <div className="run__identity">
        <span className="run__glyph" data-family={job.family} aria-hidden="true">
          {familyMeta[job.family].glyph}
        </span>
        <div className="run__text">
          <p className="run__name">
            <span className="u-truncate">{job.project}</span>
            <StatusChip status={job.status} />
          </p>
          <p className="run__sub">
            <span>{job.architectureName}</span>
            <span aria-hidden="true">·</span>
            <em className="u-truncate">{job.datasetName}</em>
            <span aria-hidden="true">·</span>
            <span>{job.owner}</span>
          </p>
        </div>
      </div>

      <div className="run__side">
        <div className="run__metrics">
          <Metric label="loss" value={formatLoss(job.loss)} />
          <Metric label="accuracy" value={formatRate(job.accuracy)} />
          <Metric label="val loss" value={formatLoss(job.valLoss)} />
          <Metric label="val acc." value={formatRate(job.valAccuracy)} />
        </div>

        {job.cancelRequested ? (
          <Chip tone="cancelled" title="El worker confirma el estado final al cerrar la época (RN-05)">
            <Icon name="clock" size={13} />
            Cancelación solicitada
          </Chip>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onCancel(job.id)}
            disabled={busy}
            aria-label={`Solicitar cancelación de ${job.id} en ${job.project}`}
          >
            <Icon name="close" size={14} />
            Cancelar
          </button>
        )}
      </div>

      <div className="run__progress">
        <ProgressBar
          value={job.progress}
          status={job.status}
          label={`Época ${job.epoch} de ${job.epochs} · lote ${job.batch} · optimizador ${job.optimizer}`}
          aside={
            job.status === 'PREPARING'
              ? 'Preparando datos'
              : remaining !== null
                ? `Restante ${formatCountdown(remaining)}`
                : `Transcurrido ${formatDuration(job.durationSeconds)}`
          }
          striped={job.status === 'RUNNING'}
        />
      </div>
    </li>
  );
}

interface ActiveTrainingsProps {
  jobs: TrainingJob[];
  queued: TrainingJob[];
  pendingCancellation: string | null;
  onCancel: (jobId: string) => void;
}

export function ActiveTrainings({ jobs, queued, pendingCancellation, onCancel }: ActiveTrainingsProps) {
  return (
    <Panel
      title="Entrenamientos en ejecución"
      subtitle="Métricas por época transmitidas desde el worker; el estado persiste en la base de datos."
      icon="training"
      body="tight"
      actions={
        <Chip tone="running" dot pulse>
          {jobs.length} {jobs.length === 1 ? 'activo' : 'activos'}
        </Chip>
      }
      footer={
        <>
          <span>
            Cola: <strong>{queued.length}</strong> {queued.length === 1 ? 'trabajo' : 'trabajos'} en espera
          </span>
          <a href="/training">Ver la cola completa</a>
        </>
      }
    >
      {jobs.length === 0 ? (
        <div className="empty">
          <Icon name="zap" />
          <h3>Sin entrenamientos activos</h3>
          <p>Cuando un trabajo pase de <em>En cola</em> a <em>Preparando</em>, aparecerá aquí con sus métricas por época.</p>
        </div>
      ) : (
        <ul className="runs">
          {jobs.map((job) => (
            <ActiveRow
              key={job.id}
              job={job}
              busy={pendingCancellation === job.id}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}

      {queued.length > 0 ? (
        <div className="queue-strip">
          <p className="u-caps">En espera</p>
          <ul>
            {queued.map((job, index) => (
              <li key={job.id}>
                <span className="queue-strip__pos">{index + 1}</span>
                <span className="u-truncate">
                  <strong>{job.project}</strong> · {job.architectureName}
                </span>
                <em>{formatRelativeTime(job.queuedAt)}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
