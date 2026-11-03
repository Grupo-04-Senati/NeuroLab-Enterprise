import { useId, useMemo, useState } from 'react';
import type { EvaluationMetric, EvaluationRun } from '@/types/evaluation';
import {
  formatMetricAxis,
  formatMetricValue,
  metricMeta,
  metricValue,
  runToneColor,
} from '@/features/evaluation/model';

const PAD = { top: 18, right: 16, bottom: 30, left: 46 };
const VB_WIDTH = 640;

interface Trace {
  key: string;
  run: EvaluationRun;
  split: 'train' | 'validation';
  color: string;
  dashed: boolean;
  path: string;
  last: { x: number; y: number };
}

export interface LearningChartProps {
  /** Ejecución evaluada primero y, después, las comparaciones. */
  runs: EvaluationRun[];
  metric: EvaluationMetric;
  height?: number;
}

/** Curvas época a época con eje único: pérdida o razón (exactitud / F1). */
export function LearningChart({ runs, metric, height = 264 }: LearningChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = `ev-area-${useId().replace(/:/g, '')}`;
  const current = runs[0];

  const geometry = useMemo(() => {
    const maxEpoch = Math.max(...runs.map((run) => run.epochs), 2);
    const innerW = VB_WIDTH - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const values = runs.flatMap((run) =>
      run.history.flatMap((point) => [
        metricValue(point, metric, 'train'),
        metricValue(point, metric, 'validation'),
      ]),
    );
    const valueMax = Math.max(...values);
    const valueMin = Math.min(...values);
    const domainMin =
      metric === 'loss' ? 0 : Math.max(0, Math.floor((valueMin - 0.03) * 20) / 20);
    const domainMax =
      metric === 'loss'
        ? Math.max(0.01, valueMax * 1.08)
        : Math.min(1, Math.ceil((valueMax + 0.01) * 100) / 100);
    const span = domainMax - domainMin || 1;

    const toX = (epoch: number) => PAD.left + ((epoch - 1) / (maxEpoch - 1)) * innerW;
    const toY = (value: number) => PAD.top + innerH - ((value - domainMin) / span) * innerH;

    const trace = (run: EvaluationRun, split: 'train' | 'validation'): string =>
      run.history
        .map((point, index) => {
          const x = toX(point.epoch).toFixed(1);
          const y = toY(metricValue(point, metric, split)).toFixed(1);
          return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    const traces: Trace[] = [];
    runs.forEach((run, index) => {
      const color = runToneColor[run.tone];
      const isCurrent = index === 0;
      if (isCurrent) {
        traces.push({
          key: `${run.id}-train`,
          run,
          split: 'train',
          color,
          dashed: false,
          path: trace(run, 'train'),
          last: {
            x: toX(run.history[run.history.length - 1].epoch),
            y: toY(metricValue(run.history[run.history.length - 1], metric, 'train')),
          },
        });
      }
      traces.push({
        key: `${run.id}-validation`,
        run,
        split: 'validation',
        color,
        dashed: true,
        path: trace(run, 'validation'),
        last: {
          x: toX(run.history[run.history.length - 1].epoch),
          y: toY(metricValue(run.history[run.history.length - 1], metric, 'validation')),
        },
      });
    });

    const baseY = PAD.top + innerH;
    const currentTrace = traces[0];
    const area = `${currentTrace.path} L${currentTrace.last.x.toFixed(1)},${baseY} L${PAD.left},${baseY} Z`;

    return {
      maxEpoch,
      innerW,
      innerH,
      baseY,
      toX,
      toY,
      traces,
      area,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        y: PAD.top + innerH - ratio * innerH,
        value: domainMin + ratio * span,
      })),
      labelEvery: Math.max(1, Math.ceil(maxEpoch / 8)),
    };
  }, [runs, metric, height]);

  const currentLatest = current.history[current.history.length - 1];
  const hoveredPoint =
    hovered === null ? null : (current.history[hovered - 1] ?? null);
  const activeEpoch = hovered ?? currentLatest.epoch;
  const crossX = geometry.toX(activeEpoch);

  return (
    <div className="chart ev-chart">
      <div className="chart__legend ev-chart__legend">
        <span>
          <i
            className="ev-swatch"
            style={{ color: runToneColor[current.tone] }}
            aria-hidden="true"
          />
          Entrenamiento · {current.id}
        </span>
        <span>
          <i
            className="ev-swatch"
            data-dashed="true"
            style={{ color: runToneColor[current.tone] }}
            aria-hidden="true"
          />
          Validación · {current.id}
        </span>
        {runs.slice(1).map((run) => (
          <span key={run.id}>
            <i
              className="ev-swatch"
              data-dashed="true"
              style={{ color: runToneColor[run.tone] }}
              aria-hidden="true"
            />
            Validación · {run.id}
          </span>
        ))}
      </div>

      <svg
        className="chart__svg"
        viewBox={`0 0 ${VB_WIDTH} ${height}`}
        role="img"
        aria-label={`${metricMeta[metric].label} por época de ${runs
          .map((run) => run.id)
          .join(', ')}`}
        onMouseLeave={() => setHovered(null)}
      >
        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              className="chart__grid-line"
              x1={PAD.left}
              x2={VB_WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="chart__axis-text"
              x={PAD.left - 8}
              y={tick.y + 3.5}
              textAnchor="end"
            >
              {formatMetricAxis(metric, tick.value)}
            </text>
          </g>
        ))}

        <path d={geometry.area} fill={`url(#${gradientId})`} opacity="0.5" />

        {geometry.traces.map((trace) => (
          <path
            key={trace.key}
            d={trace.path}
            className="ev-chart__line"
            style={{ stroke: trace.color }}
            data-dashed={trace.dashed || undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {geometry.traces.map((trace) => (
          <circle
            key={`${trace.key}-last`}
            cx={trace.last.x}
            cy={trace.last.y}
            r={3}
            className="ev-chart__point"
            style={{ stroke: trace.color }}
          />
        ))}

        {hovered !== null ? (
          <line
            className="chart__crosshair"
            x1={crossX}
            x2={crossX}
            y1={PAD.top}
            y2={geometry.baseY}
          />
        ) : null}

        {hoveredPoint ? (
          <g>
            <circle
              cx={geometry.toX(hoveredPoint.epoch)}
              cy={geometry.toY(metricValue(hoveredPoint, metric, 'train'))}
              r={4.2}
              className="ev-chart__point ev-chart__point--active"
              style={{ stroke: runToneColor[current.tone] }}
            />
            <circle
              cx={geometry.toX(hoveredPoint.epoch)}
              cy={geometry.toY(metricValue(hoveredPoint, metric, 'validation'))}
              r={4.2}
              className="ev-chart__point ev-chart__point--active"
              style={{ stroke: runToneColor[current.tone] }}
            />
          </g>
        ) : null}

        {Array.from({ length: geometry.maxEpoch }, (_, index) => {
          const epoch = index + 1;
          const step = geometry.innerW / geometry.maxEpoch;
          return (
            <g key={epoch}>
              {epoch % geometry.labelEvery === 1 || epoch === geometry.maxEpoch ? (
                <text
                  className="chart__axis-text"
                  x={geometry.toX(epoch)}
                  y={geometry.baseY + 16}
                  textAnchor="middle"
                >
                  {epoch}
                </text>
              ) : null}
              <rect
                x={geometry.toX(epoch) - step / 2}
                y={PAD.top}
                width={step}
                height={geometry.innerH}
                fill="transparent"
                onMouseEnter={() => setHovered(epoch)}
              />
            </g>
          );
        })}

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={runToneColor[current.tone]} stopOpacity="0.18" />
            <stop offset="100%" stopColor={runToneColor[current.tone]} stopOpacity="0" />
          </linearGradient>
        </defs>

        <text className="chart__axis-title" x={PAD.left} y={11}>
          {metricMeta[metric].axis}
        </text>
      </svg>

      <div className="ev-chart__tip" aria-live="polite">
        {hovered !== null && hoveredPoint ? (
          <>
            <p className="ev-chart__tip-head">
              Época {hoveredPoint.epoch}
              <span>· {current.id}</span>
            </p>
            <ul>
              <li>
                <i style={{ background: runToneColor[current.tone] }} aria-hidden="true" />
                <span>Entrenamiento</span>
                <strong>{formatMetricValue(metric, metricValue(hoveredPoint, metric, 'train'))}</strong>
              </li>
              <li>
                <i
                  className="ev-chart__tip-dash"
                  style={{ color: runToneColor[current.tone] }}
                  aria-hidden="true"
                />
                <span>Validación</span>
                <strong>
                  {formatMetricValue(metric, metricValue(hoveredPoint, metric, 'validation'))}
                </strong>
              </li>
              {runs.slice(1).map((run) => {
                const point = run.history[hoveredPoint.epoch - 1];
                return (
                  <li key={run.id}>
                    <i
                      className="ev-chart__tip-dash"
                      style={{ color: runToneColor[run.tone] }}
                      aria-hidden="true"
                    />
                    <span>Validación · {run.id}</span>
                    <strong>
                      {point
                        ? formatMetricValue(metric, metricValue(point, metric, 'validation'))
                        : 'sin datos'}
                    </strong>
                  </li>
                );
              })}
            </ul>
          </>
        ) : hovered !== null ? (
          <p className="ev-chart__tip-head">
            Época {hovered}
            <span> · {current.id}</span>
            <strong>sin métricas registradas</strong>
          </p>
        ) : (
          <p className="ev-chart__tip-head">
            Época {currentLatest.epoch}
            <span> · {metricMeta[metric].label.toLowerCase()} final</span>
            <strong>
              {formatMetricValue(metric, metricValue(currentLatest, metric, 'train'))} ent ·{' '}
              {formatMetricValue(metric, metricValue(currentLatest, metric, 'validation'))} val
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}
