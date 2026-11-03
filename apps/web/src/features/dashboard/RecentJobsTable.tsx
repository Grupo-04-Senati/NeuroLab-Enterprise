import type { TrainingJob } from '@/types/domain';
import { familyMeta } from '@/lib/nav';
import { formatDuration, formatLoss, formatRate, formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { StatusChip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';

interface RecentJobsTableProps {
  jobs: TrainingJob[];
  total: number;
  filtered: boolean;
}

export function RecentJobsTable({ jobs, total, filtered }: RecentJobsTableProps) {
  return (
    <Panel
      title="Historial reciente de ejecuciones"
      subtitle="Cada trabajo conserva parámetros, fechas y referencia al dataset para su trazabilidad."
      icon="clock"
      body="tight"
      footer={
        <>
          <span>
            {filtered
              ? `${jobs.length} de ${total} trabajos según el filtro activo`
              : `${total} trabajos consultados en la ventana actual`}
          </span>
          <a href="/reports">Exportar informe</a>
        </>
      }
    >
      <div className="table-wrap">
        {jobs.length === 0 ? (
          <div className="empty">
            <Icon name="search" />
            <h3>Sin resultados para este filtro</h3>
            <p>Ajuste la búsqueda o seleccione otro estado para volver a ver ejecuciones.</p>
          </div>
        ) : (
          <table className="table">
            <caption className="u-sr-only">
              Trabajos de entrenamiento finalizados con su estado, métricas y duración
            </caption>
            <thead>
              <tr>
                <th scope="col">Trabajo</th>
                <th scope="col">Arquitectura</th>
                <th scope="col">Estado</th>
                <th scope="col">Épocas</th>
                <th scope="col">Val. acc.</th>
                <th scope="col">Duración</th>
                <th scope="col" className="is-right">
                  Finalizado
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td data-col="name" data-label="Proyecto / trabajo">
                    <span className="table__name">
                      <strong>{job.project}</strong>
                      <span>
                        {job.id} · {job.datasetName}
                      </span>
                    </span>
                  </td>
                  <td data-label="Arquitectura">
                    <span className="table__name">
                      <strong>{job.architectureName}</strong>
                      <span className="table__sub">{familyMeta[job.family].label}</span>
                    </span>
                  </td>
                  <td data-label="Estado">
                    <StatusChip status={job.status} />
                  </td>
                  <td data-label="Épocas" data-numeric>
                    {job.epoch}/{job.epochs}
                  </td>
                  <td data-label="Val. accuracy" data-numeric>
                    {job.status === 'FAILED'
                      ? formatLoss(job.valLoss)
                      : formatRate(job.valAccuracy)}
                  </td>
                  <td data-label="Duración" data-numeric>
                    {formatDuration(job.durationSeconds)}
                  </td>
                  <td data-col="meta" data-label="Finalizado" className="is-right" data-numeric>
                    {job.endedAt ? formatRelativeTime(job.endedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
