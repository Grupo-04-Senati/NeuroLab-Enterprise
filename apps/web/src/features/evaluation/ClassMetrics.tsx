import type { EvaluationRun } from '@/types/evaluation';
import { evaluationClasses } from '@/lib/mock/evaluation';
import { formatNumber, formatRate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { metricsFromConfusion } from '@/features/evaluation/model';

function toneForF1(value: number): 'ok' | 'warning' | 'danger' {
  if (value >= 0.9) return 'ok';
  if (value >= 0.82) return 'warning';
  return 'danger';
}

function MetricCell({ value }: { value: number }) {
  return (
    <td className="ev-classes__metric">
      <span className="ev-classes__value">{formatRate(value)}</span>
      <span className="ev-classes__bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, value * 100)}%` }} data-tone={toneForF1(value)} />
      </span>
    </td>
  );
}

export function ClassMetrics({ run }: { run: EvaluationRun }) {
  const { perClass, summary } = metricsFromConfusion(run.confusion);
  const weakest = perClass[Number(summary.weakestClassId)];

  return (
    <div className="ev-classes-block">
      <table className="ev-classes">
        <caption className="u-sr-only">
          Precisión, exhaustividad y F1 por clase de {run.id}.
        </caption>
        <thead>
          <tr>
            <th scope="col">Clase</th>
            <th scope="col">Precisión</th>
            <th scope="col">Recall</th>
            <th scope="col">F1</th>
            <th scope="col" className="ev-classes__support">
              Soporte
            </th>
          </tr>
        </thead>
        <tbody>
          {perClass.map((item, index) => {
            const meta = evaluationClasses[index];
            const isWeakest = index === Number(summary.weakestClassId);
            return (
              <tr key={meta.id} data-weak={isWeakest || undefined}>
                <th scope="row">
                  <span className="ev-classes__name">{meta.label}</span>
                  {isWeakest ? <span className="ev-classes__flag">F1 más bajo</span> : null}
                </th>
                <MetricCell value={item.precision} />
                <MetricCell value={item.recall} />
                <MetricCell value={item.f1} />
                <td className="ev-classes__support">{formatNumber(item.support)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="panel__note ev-classes__note">
        <Icon name="alertTriangle" size={14} />
        <span>
          {evaluationClasses[Number(summary.weakestClassId)].label} registra el F1 más bajo (
          {formatRate(weakest.f1)}) con {formatNumber(weakest.falseNegative)} falsos negativos.
          Conviene revisar ese umbral antes de publicar el modelo.
        </span>
      </p>
    </div>
  );
}
