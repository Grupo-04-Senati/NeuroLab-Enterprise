import type { EvaluationRun } from '@/types/evaluation';
import { familyMeta } from '@/lib/nav';
import { formatLoss, formatNumber, formatRate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { metricsFromConfusion, signed } from '@/features/evaluation/model';

export interface ComparisonTableProps {
  runs: EvaluationRun[];
  currentId: string;
  compareIds: string[];
  onSelect: (runId: string) => void;
  onToggleCompare: (runId: string) => void;
}

const MAX_COMPARISONS = 2;

/** Comparación de ejecuciones completadas; la fila activa alimenta el resto del informe. */
export function ComparisonTable({
  runs,
  currentId,
  compareIds,
  onSelect,
  onToggleCompare,
}: ComparisonTableProps) {
  const current = runs.find((run) => run.id === currentId) ?? runs[0];
  const currentF1 = metricsFromConfusion(current.confusion).summary.f1;

  return (
    <div className="ev-table-wrap">
      <table className="ev-table">
        <caption className="u-sr-only">
          Comparación de las ejecuciones evaluadas del proyecto. El F1 delta se calcula contra{' '}
          {current.id}.
        </caption>
        <thead>
          <tr>
            <th scope="col">Ejecución</th>
            <th scope="col">F1 macro</th>
            <th scope="col">Exactitud</th>
            <th scope="col">Pérdida prueba</th>
            <th scope="col">Δ F1</th>
            <th scope="col">Mejor época</th>
            <th scope="col">p95</th>
            <th scope="col" className="ev-table__compare">
              Comparar
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const summary = metricsFromConfusion(run.confusion).summary;
            const isCurrent = run.id === currentId;
            const isCompared = compareIds.includes(run.id);
            const delta = (summary.f1 - currentF1) * 100;
            const disabled = isCurrent || (!isCompared && compareIds.length >= MAX_COMPARISONS);

            return (
              <tr
                key={run.id}
                className={isCurrent ? 'is-selected' : undefined}
                tabIndex={0}
                aria-current={isCurrent || undefined}
                title={isCurrent ? 'Ejecución evaluada' : 'Evaluar esta ejecución'}
                onClick={() => onSelect(run.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onSelect(run.id);
                }}
              >
                <th scope="row">
                  <span className="ev-table__name">
                    <strong>{run.name}</strong>
                    <span>
                      {run.id} · {familyMeta[run.family].label} · {run.datasetVersion} ·{' '}
                      {formatNumber(run.epochs)} épocas
                    </span>
                  </span>
                </th>
                <td data-numeric>{formatRate(summary.f1)}</td>
                <td data-numeric>{formatRate(summary.accuracy)}</td>
                <td data-numeric>{formatLoss(run.testLoss)}</td>
                <td data-numeric>
                  {isCurrent ? (
                    <span className="ev-table__ref">referencia</span>
                  ) : (
                    <span className="ev-delta" data-good={delta >= 0}>
                      <Icon name={delta >= 0 ? 'trendingUp' : 'trendingDown'} size={12} />
                      {signed(delta)} pts
                    </span>
                  )}
                </td>
                <td data-numeric>
                  {run.bestEpoch} <span className="ev-table__of">/ {run.epochs}</span>
                </td>
                <td data-numeric>{formatNumber(run.latencyP95Ms)} ms</td>
                <td className="ev-table__compare">
                  <label
                    className="ev-check"
                    title={
                      isCurrent
                        ? 'La ejecución evaluada ya está en la gráfica.'
                        : disabled
                          ? 'Máximo dos comparaciones; desmarque una para añadir otra.'
                          : `Superponer ${run.id} en la gráfica de aprendizaje`
                    }
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isCurrent || isCompared}
                      disabled={disabled}
                      onChange={() => onToggleCompare(run.id)}
                    />
                    <span className="u-sr-only">Comparar {run.id} en la gráfica</span>
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="panel__note ev-table__note">
        Haga clic en una fila para evaluarla; marque hasta dos ejecuciones para superponer su
        validación en la gráfica de aprendizaje. El Δ F1 se mide en puntos porcentuales contra{' '}
        {current.id}.
      </p>
    </div>
  );
}
