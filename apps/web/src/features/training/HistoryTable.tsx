import { useMemo, useState } from 'react';
import type { Actor, JobStatus, TrainingJob } from '@/types/domain';
import { familyMeta, statusMeta } from '@/lib/nav';
import { formatDateTime, formatDuration, formatNumber, formatRate } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip, StatusChip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { PRIORITY_LABEL, can, shortName } from '@/features/training/model';
import type { RunRecord } from '@/features/training/model';

/* §7 · historial de ejecuciones: fecha, versión, duración, estado, parámetros
   principales y sólo las acciones autorizadas por el rol (§10 trazabilidad). */

const FINAL: JobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

type StatusFilter = JobStatus | 'ALL';

interface HistoryTableProps {
  actor: Actor;
  jobs: TrainingJob[];
  recordOf: (job: TrainingJob) => RunRecord;
  selectedId: string;
  onSelect: (jobId: string) => void;
  onRetry: (job: TrainingJob) => void;
}

export function HistoryTable({ actor, jobs, recordOf, selectedId, onSelect, onRetry }: HistoryTableProps) {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [query, setQuery] = useState('');
  const me = shortName(actor.displayName);

  const closed = useMemo(() => jobs.filter((job) => FINAL.includes(job.status)), [jobs]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return closed
      .filter((job) => status === 'ALL' || job.status === status)
      .filter((job) => {
        if (!needle) return true;
        return [job.id, job.project, job.architectureName, job.datasetName, job.owner, job.optimizer]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => Date.parse(b.endedAt ?? b.queuedAt) - Date.parse(a.endedAt ?? a.queuedAt));
  }, [closed, query, status]);

  const counts = useMemo(() => {
    const map = new Map<JobStatus, number>();
    closed.forEach((job) => map.set(job.status, (map.get(job.status) ?? 0) + 1));
    return map;
  }, [closed]);

  return (
    <Panel
      title="Historial de ejecuciones"
      subtitle="Cada renglón conserva la configuración que produjo el resultado: sin ella el experimento no es reproducible."
      icon="clock"
      body="tight"
      actions={
        <>
          <Chip tone="completed">{counts.get('COMPLETED') ?? 0} completados</Chip>
          <Chip tone="failed">{counts.get('FAILED') ?? 0} fallidos</Chip>
          <Chip tone="cancelled">{counts.get('CANCELLED') ?? 0} cancelados</Chip>
        </>
      }
      footer={
        <>
          <span>
            Mostrando <strong>{rows.length}</strong> de {closed.length} ejecuciones cerradas
          </span>
          <a href="/models">Registro de modelos (M08)</a>
        </>
      }
    >
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filtrar historial por estado">
          {(['ALL', ...FINAL] as StatusFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              className="filter-btn"
              aria-pressed={option === status}
              onClick={() => setStatus(option)}
            >
              {option === 'ALL' ? 'Todas' : statusMeta[option].label}
              <span className="filter-btn__count">{option === 'ALL' ? closed.length : counts.get(option) ?? 0}</span>
            </button>
          ))}
        </div>

        <label className="tr-search">
          <span className="u-sr-only">Buscar en el historial</span>
          <Icon name="search" size={15} />
          <input
            type="search"
            value={query}
            placeholder="Trabajo, proyecto, arquitectura o dataset"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <Icon name="search" />
          <h3>Sin resultados</h3>
          <p>Ninguna ejecución cerrada coincide con el filtro. Cambie el estado o limpie la búsqueda.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="u-sr-only">
              Ejecuciones cerradas con fecha, versión, duración, estado, parámetros principales y acciones
              autorizadas
            </caption>
            <thead>
              <tr>
                <th scope="col">Trabajo</th>
                <th scope="col">Fecha de cierre</th>
                <th scope="col">Versión</th>
                <th scope="col" className="is-right">
                  Duración
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Parámetros principales</th>
                <th scope="col" className="is-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => {
                const record = recordOf(job);
                const mine = job.owner === me;
                return (
                  <tr key={job.id} data-selected={selectedId === job.id || undefined}>
                    <td data-label="Trabajo">
                      <button
                        type="button"
                        className="table__name tr-queue__pick"
                        onClick={() => onSelect(job.id)}
                        aria-pressed={selectedId === job.id}
                        title={`Abrir ${job.id} en el panel de progreso`}
                      >
                        <span className="run__glyph" data-family={job.family} aria-hidden="true">
                          {familyMeta[job.family].glyph}
                        </span>
                        <span className="tr-queue__text">
                          <strong className="u-truncate">{job.project}</strong>
                          <span className="table__sub u-mono">{job.id} · {job.owner}</span>
                        </span>
                      </button>
                    </td>

                    <td data-label="Cierre" className="u-num">
                      {job.endedAt ? formatDateTime(job.endedAt) : '—'}
                      <span className="table__sub">{formatNumber(job.epoch)}/{formatNumber(job.epochs)} épocas</span>
                    </td>

                    <td data-label="Versión">
                      <span className="u-mono">{record.version}</span>
                      <span className="table__sub u-truncate">{job.architectureName}</span>
                    </td>

                    <td data-label="Duración" className="is-right u-num">
                      {job.durationSeconds > 0 ? (
                        formatDuration(job.durationSeconds)
                      ) : (
                        <span title="El trabajo se cerró antes de que el scheduler le asignara un worker.">sin cómputo</span>
                      )}
                    </td>

                    <td data-label="Estado">
                      <StatusChip status={job.status} />
                      {record.retryOf ? (
                        <p className="tr-queue__flag">
                          <Icon name="refresh" size={11} />
                          Reintento de {record.retryOf}
                        </p>
                      ) : null}
                      {job.status === 'CANCELLED' && record.motivo ? (
                        <p className="tr-queue__flag" title={record.motivo}>
                          <Icon name="alertCircle" size={11} />
                          <span className="u-truncate">{record.motivo}</span>
                        </p>
                      ) : null}
                    </td>

                    <td data-label="Parámetros">
                      <p className="tr-params">
                        <span>{formatNumber(job.epochs)} épocas</span>
                        <span>lote {formatNumber(job.batch)}</span>
                        <span>{job.optimizer}</span>
                        <span>lr {formatNumber(record.learningRate, 4)}</span>
                        <span>semilla {record.seed}</span>
                        <span>{PRIORITY_LABEL[record.priority]}</span>
                      </p>
                      <p className="table__sub u-truncate">
                        {job.datasetName} · exactitud final {job.epoch > 0 ? formatRate(job.accuracy) : 'sin datos'}
                      </p>
                    </td>

                    <td data-label="Acciones" className="is-right">
                      <div className="tr-queue__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => onRetry(job)}
                          disabled={!can(actor, 'reintentar', { mine })}
                          title={
                            can(actor, 'reintentar', { mine })
                              ? 'Encolar una ejecución nueva con estos parámetros, conservando la trazabilidad'
                              : 'Su rol no permite reintentar trabajos ajenos'
                          }
                        >
                          <Icon name="refresh" size={13} />
                          Reintentar
                        </button>
                        <a
                          className="btn btn--ghost btn--sm"
                          href="/evaluation"
                          title="Comparar el resultado en M07"
                        >
                          <Icon name="metrics" size={13} />
                          Evaluar
                        </a>
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
