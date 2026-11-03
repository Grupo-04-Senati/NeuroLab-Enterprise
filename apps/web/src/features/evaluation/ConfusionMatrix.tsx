import type { EvaluationRun } from '@/types/evaluation';
import { evaluationClasses } from '@/lib/mock/evaluation';
import { formatNumber, formatRate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { largestConfusionPair, metricsFromConfusion } from '@/features/evaluation/model';

export interface ConfusionMatrixProps {
  run: EvaluationRun;
  /** `true` muestra la proporción sobre el soporte real de cada fila. */
  normalized: boolean;
}

/** Matriz de confusión 4×4: filas = clase real, columnas = clase predicha. */
export function ConfusionMatrix({ run, normalized }: ConfusionMatrixProps) {
  const { perClass, summary } = metricsFromConfusion(run.confusion);
  const pair = largestConfusionPair(run.confusion);
  const maxCell = Math.max(...run.confusion.flat());

  return (
    <div className="ev-matrix-block">
      <div className="ev-matrix-wrap">
        <table className="ev-matrix">
          <caption className="u-sr-only">
            Matriz de confusión de {run.id} sobre {formatNumber(run.samples)} muestras de prueba.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="ev-matrix__corner">
                <span>Real</span>
                <span>Predicho</span>
              </th>
              {evaluationClasses.map((item) => (
                <th scope="col" key={item.id}>
                  {item.short}
                </th>
              ))}
              <th scope="col" className="ev-matrix__total">
                Soporte
              </th>
            </tr>
          </thead>
          <tbody>
            {run.confusion.map((row, actual) => {
              const support = row.reduce((sum, value) => sum + value, 0);
              return (
                <tr key={evaluationClasses[actual].id}>
                  <th scope="row">{evaluationClasses[actual].label}</th>
                  {row.map((count, predicted) => {
                    const hit = actual === predicted;
                    const share = support > 0 ? count / support : 0;
                    const intensity = 0.06 + 0.62 * (count / maxCell);
                    const strong = hit && intensity > 0.44;
                    const background = hit
                      ? `rgba(79, 70, 229, ${intensity.toFixed(3)})`
                      : `rgba(225, 29, 72, ${Math.min(0.45, intensity * 0.62).toFixed(3)})`;
                    const label = `Real ${evaluationClasses[actual].label} → predicho ${
                      evaluationClasses[predicted].label
                    }: ${formatNumber(count)} casos (${formatRate(share)} del soporte)`;
                    return (
                      <td
                        key={evaluationClasses[predicted].id}
                        data-hit={hit || undefined}
                        data-strong={strong || undefined}
                        style={{ backgroundColor: background }}
                        title={label}
                      >
                        <span className="ev-matrix__value">
                          {normalized ? formatRate(share) : formatNumber(count)}
                        </span>
                        <span className="ev-matrix__sub">
                          {normalized ? `${formatNumber(count)} casos` : formatRate(share)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="ev-matrix__total">{formatNumber(support)}</td>
                </tr>
              );
            })}
            <tr className="ev-matrix__footer">
              <th scope="row">Predichos</th>
              {perClass.map((item, index) => (
                <td key={evaluationClasses[index].id}>{formatNumber(item.predicted)}</td>
              ))}
              <td className="ev-matrix__total">{formatNumber(summary.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ev-matrix__read">
        <span>
          <Icon name="checkCircle" size={14} />
          Diagonal = aciertos · {formatRate(summary.accuracy)} de exactitud global
        </span>
        {pair ? (
          <span>
            <Icon name="alertTriangle" size={14} />
            Error más frecuente: {evaluationClasses[pair.actual].label} →{' '}
            {evaluationClasses[pair.predicted].label} ({formatNumber(pair.count)} casos)
          </span>
        ) : null}
      </div>
    </div>
  );
}
