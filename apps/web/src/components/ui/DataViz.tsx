import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ActivityPoint, EpochPoint, EvaluationMatrix } from '@/types/domain';
import { formatLoss, formatNumber, formatRate } from '@/lib/format';
import { Icon, type IconName } from '@/components/ui/Icon';

export function Trend({
  direction,
  children,
}: {
  direction: 'up' | 'down' | 'flat';
  children: React.ReactNode;
}) {
  const icon: IconName = direction === 'up' ? 'trendingUp' : direction === 'down' ? 'trendingDown' : 'minus';
  return (
    <span className={`trend trend--${direction}`}>
      <Icon name={icon} size={13} strokeWidth={2.1} aria-hidden="true" />
      {children}
    </span>
  );
}

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Trazo compacto para el pie de las tarjetas de resumen. */
export function Sparkline({ values, width = 84, height = 26, color = 'var(--data)' }: SparklineProps) {
  const geometry = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / span) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, width, height]);

  if (!geometry) return null;

  return (
    <svg
      className="chart__svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <polyline
        points={geometry}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

export interface ActivityChartProps {
  data: ActivityPoint[];
  /** Altura del lienzo en unidades del viewBox. */
  height?: number;
}

const PAD = { top: 14, right: 10, bottom: 26, left: 34 };
const VB_WIDTH = 560;

/** Evolución diaria de trabajos completados y épocas consumidas. */
export function ActivityChart({ data, height = 188 }: ActivityChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const innerW = VB_WIDTH - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const maxJobs = Math.max(...data.map((point) => point.jobs), 1);
    const maxEpochs = Math.max(...data.map((point) => point.epochs), 1);
    const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

    const toX = (index: number) => PAD.left + index * step;
    const toY = (value: number, max: number) => PAD.top + innerH - (value / max) * innerH;

    const jobsPoints = data.map((point, index) => `${toX(index)},${toY(point.jobs, maxJobs)}`);
    const epochsPoints = data.map((point, index) => `${toX(index)},${toY(point.epochs, maxEpochs)}`);

    return {
      innerH,
      area: `M${PAD.left},${PAD.top + innerH} L${jobsPoints.join(' L')} L${toX(data.length - 1)},${
        PAD.top + innerH
      } Z`,
      jobsLine: `M${jobsPoints.join(' L')}`,
      epochsLine: `M${epochsPoints.join(' L')}`,
      marks: data.map((point, index) => ({
        x: toX(index),
        y: toY(point.jobs, maxJobs),
        point,
      })),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        y: PAD.top + innerH - ratio * innerH,
        label: Math.round(ratio * maxJobs),
      })),
    };
  }, [data, height]);

  const active = hovered === null ? null : geometry.marks[hovered];

  return (
    <div className="chart">
      <div className="chart__legend">
        <span>
          <i className="chart__swatch" aria-hidden="true" />
          Trabajos completados
        </span>
        <span>
          <i className="chart__swatch chart__swatch--alt" aria-hidden="true" />
          Épocas consumidas
        </span>
      </div>

      <svg
        className="chart__svg"
        viewBox={`0 0 ${VB_WIDTH} ${height}`}
        role="img"
        aria-label="Actividad de entrenamientos en los últimos 14 días"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--data)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--data)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {geometry.ticks.map((tick) => (
          <g key={tick.y}>
            <line
              className="chart__grid-line"
              x1={PAD.left}
              x2={VB_WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="chart__axis-text" x={PAD.left - 8} y={tick.y + 3.5} textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}

        <path d={geometry.area} fill={`url(#area-${gradientId})`} />
        <path
          d={geometry.epochsLine}
          className="chart__line chart__line--ghost"
          vectorEffect="non-scaling-stroke"
        />
        <path d={geometry.jobsLine} className="chart__line" vectorEffect="non-scaling-stroke" />

        {geometry.marks.map((mark, index) => (
          <g key={index}>
            {mark.point.day ? (
              <text
                className="chart__axis-text"
                x={mark.x}
                y={height - 8}
                textAnchor="middle"
              >
                {mark.point.day}
              </text>
            ) : null}
            <circle
              className="chart__point"
              cx={mark.x}
              cy={mark.y}
              r={hovered === index ? 4.4 : 2.6}
            />
            <rect
              x={mark.x - 12}
              y={PAD.top}
              width={24}
              height={geometry.innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
          </g>
        ))}
      </svg>

      <div className="chart__tooltip" aria-live="polite">
        {active ? (
          <>
            <span>{active.point.day || `Día · ${active.point.jobs} trabajos`}</span>
            <strong>
              {active.point.jobs} trabajos · {active.point.epochs} épocas
            </strong>
          </>
        ) : (
          <>
            <span>Media diaria</span>
            <strong>
              {Math.round(data.reduce((sum, point) => sum + point.jobs, 0) / data.length)} trabajos
            </strong>
          </>
        )}
      </div>
    </div>
  );
}

export interface HeatmapProps {
  matrix: EvaluationMatrix;
}

/**
 * Mapa de calor de la matriz de confusión. La intensidad del verde es proporcional
 * a la normalización por fila, de modo que la diagonal se lee aun con clases desbalanceadas.
 */
export function HeatmapGrid({ matrix }: HeatmapProps) {
  const total = matrix.classes.reduce((sum, row) => sum + row.counts.reduce((a, b) => a + b, 0), 0);
  const worst = matrix.classes.reduce(
    (best, row) => (row.f1 < best.f1 ? row : best),
    matrix.classes[0],
  );
  const cells = matrix.classes.flatMap((row) =>
    row.counts.map((count, index) => ({
      key: `${row.label}:${index}`,
      count,
      ratio: row.total > 0 ? count / row.total : 0,
      diagonal: index === row.index,
      label: row.label,
      predicted: matrix.classes[index].label,
    })),
  );

  return (
    <div className="eval-heatmap">
      {cells.map((cell) => (
        <div
          key={cell.key}
          className="eval-cell"
          style={{
            background: cell.diagonal
              ? `color-mix(in srgb, var(--success) ${8 + cell.ratio * 62}%, var(--surface-sunken))`
              : cell.count === 0
                ? 'var(--surface-sunken)'
                : `color-mix(in srgb, var(--danger) ${Math.min(78, 10 + cell.ratio * 260)}%, var(--surface-sunken))`,
          }}
          title={`${cell.label} → ${cell.predicted}: ${formatNumber(cell.count)} casos · ${formatRate(
            cell.count / (total || 1),
            1,
          )} del total`}
        >
          <span>{formatNumber(cell.count)}</span>
        </div>
      ))}
      <p className="eval-heatmap__note">
        Diagonal en verde (acierto por clase real) y errores en rojo, intensificados por fila para
        que una clase con 265 casos no eclipse a otra con 18 000. La clase{' '}
        <strong>{worst.label}</strong> es la más débil, con F1 {formatRate(worst.f1)}.
      </p>
    </div>
  );
}

export interface LossGainChartProps {
  points: EpochPoint[];
  /** Modelo o algoritmo representado; alimenta el anuncio accesible de la gráfica. */
  model: string;
  height?: number;
}

const CURVE_PAD = { top: 20, right: 48, bottom: 30, left: 48 };

/** Techo del eje de pérdida, redondeado a media década para dar etiquetas legibles. */
function lossAxisMax(value: number): number {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value)) / 2;
  return Math.ceil(value / step) * step;
}

/**
 * Mide el ancho real del contenedor para que una unidad del viewBox sea un píxel:
 * los ejes y sus etiquetas conservan el mismo tamaño físico en móvil y escritorio.
 */
function useContainerWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    /* El primer ancho se lee en caliente: sin ello la gráfica arranca con el viewBox genérico. */
    setWidth(Math.round(node.clientWidth));
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/**
 * Curva de aprendizaje época a época: pérdida (eje izquierdo) frente a ganancia
 * o exactitud (eje derecho), con sus contrapartes de validación.
 */
export function LossGainChart({ points, model, height = 232 }: LossGainChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [wrapRef, measured] = useContainerWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const vbW = measured > 0 ? Math.max(240, measured) : VB_WIDTH;

  const geometry = useMemo(() => {
    const innerW = vbW - CURVE_PAD.left - CURVE_PAD.right;
    const innerH = height - CURVE_PAD.top - CURVE_PAD.bottom;
    const baseY = CURVE_PAD.top + innerH;

    const lossTop = lossAxisMax(Math.max(...points.map((p) => Math.max(p.loss, p.valLoss))));

    const gains = points.flatMap((p) => [p.accuracy, p.valAccuracy]);
    const minGain = Math.min(...gains);
    const maxGain = Math.max(...gains);
    const margin = Math.max(0.02, (maxGain - minGain) * 0.3);
    const gainFloor = Math.max(0, Math.floor((minGain - margin) * 20) / 20);
    const gainCeil = Math.min(1, Math.ceil(maxGain * 20) / 20);
    const gainSpan = gainCeil - gainFloor || 1;

    const toX = (index: number) =>
      points.length > 1
        ? CURVE_PAD.left + (index / (points.length - 1)) * innerW
        : CURVE_PAD.left + innerW / 2;
    const lossY = (value: number) => baseY - (value / lossTop) * innerH;
    const gainY = (value: number) => baseY - ((value - gainFloor) / gainSpan) * innerH;

    const trace = (pick: (p: EpochPoint) => number, scale: (v: number) => number) =>
      points
        .map((point, index) => {
          const cmd = index === 0 ? 'M' : 'L';
          return `${cmd}${toX(index).toFixed(1)},${scale(pick(point)).toFixed(1)}`;
        })
        .join(' ');

    const last = points.length - 1;

    return {
      innerH,
      baseY,
      gainSpan,
      lossArea: `M${toX(0).toFixed(1)},${baseY} L${trace((p) => p.loss, lossY).slice(1)} L${toX(last).toFixed(1)},${baseY} Z`,
      lossLine: trace((p) => p.loss, lossY),
      valLossLine: trace((p) => p.valLoss, lossY),
      gainLine: trace((p) => p.accuracy, gainY),
      valGainLine: trace((p) => p.valAccuracy, gainY),
      marks: points.map((point, index) => ({
        x: toX(index),
        lossY: lossY(point.loss),
        gainY: gainY(point.accuracy),
        point,
      })),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        y: baseY - ratio * innerH,
        loss: formatLoss(ratio * lossTop),
        gain: formatRate(gainFloor + ratio * gainSpan, 0),
      })),
      /* Numerar las 60 épocas las solaparía: se etiqueta una de cada N. */
      labelEvery: Math.max(1, Math.ceil(points.length / 7)),
    };
  }, [points, height, vbW]);

  const active = hovered === null ? null : geometry.marks[hovered];
  const latest = geometry.marks[geometry.marks.length - 1];

  return (
    <div className="chart" ref={wrapRef}>
      <div className="chart__legend">
        <span>
          <i className="chart__swatch" aria-hidden="true" />
          Pérdida entrenamiento
        </span>
        <span>
          <i className="chart__swatch chart__swatch--dashed" aria-hidden="true" />
          Pérdida validación
        </span>
        <span>
          <i className="chart__swatch chart__swatch--gain" aria-hidden="true" />
          Ganancia entrenamiento
        </span>
        <span>
          <i
            className="chart__swatch chart__swatch--gain chart__swatch--dashed"
            aria-hidden="true"
          />
          Ganancia validación
        </span>
      </div>

      <svg
        className="chart__svg"
        viewBox={`0 0 ${vbW} ${height}`}
        role="img"
        aria-label={`Curva de pérdida y ganancia de ${model} a lo largo de ${points.length} épocas`}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={`lossFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--data)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--data)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.ticks.map((tick, index) => (
          <g key={tick.y}>
            <line
              className="chart__grid-line"
              x1={CURVE_PAD.left}
              x2={vbW - CURVE_PAD.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="chart__axis-text" x={CURVE_PAD.left - 8} y={tick.y + 3.5} textAnchor="end">
              {tick.loss}
            </text>
            {index % 2 === 0 ? (
              <text
                className="chart__axis-text chart__axis-text--gain"
                x={vbW - CURVE_PAD.right + 8}
                y={tick.y + 3.5}
                textAnchor="start"
              >
                {tick.gain}
              </text>
            ) : null}
          </g>
        ))}

        <path d={geometry.lossArea} fill={`url(#lossFill-${gradientId})`} />
        <path
          d={geometry.valGainLine}
          className="chart__line chart__line--gain chart__line--validation"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={geometry.gainLine}
          className="chart__line chart__line--gain"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={geometry.valLossLine}
          className="chart__line chart__line--validation"
          vectorEffect="non-scaling-stroke"
        />
        <path d={geometry.lossLine} className="chart__line" vectorEffect="non-scaling-stroke" />

        {hovered === null ? (
          <g>
            <circle className="chart__point" cx={latest.x} cy={latest.lossY} r={3.2} />
            <circle
              className="chart__point chart__point--gain"
              cx={latest.x}
              cy={latest.gainY}
              r={3.2}
            />
          </g>
        ) : null}

        {geometry.marks.map((mark, index) => (
          <g key={mark.point.epoch}>
            {mark.point.epoch % geometry.labelEvery === 1 || index === geometry.marks.length - 1 ? (
              <text
                className="chart__axis-text"
                x={mark.x}
                y={geometry.baseY + 16}
                textAnchor="middle"
              >
                {mark.point.epoch}
              </text>
            ) : null}
            {active?.point.epoch === mark.point.epoch ? (
              <line
                className="chart__crosshair"
                x1={mark.x}
                x2={mark.x}
                y1={CURVE_PAD.top}
                y2={geometry.baseY}
              />
            ) : null}
            <rect
              x={mark.x - 14}
              y={CURVE_PAD.top}
              width={28}
              height={geometry.innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
          </g>
        ))}

        <text className="chart__axis-title" x={CURVE_PAD.left - 8} y={11} textAnchor="end">
          pérdida
        </text>
        <text
          className="chart__axis-title chart__axis-title--gain"
          x={vbW - CURVE_PAD.right + 8}
          y={11}
          textAnchor="start"
        >
          ganancia
        </text>
      </svg>

      <div className="chart__tooltip chart__tooltip--curve" aria-live="polite">
        <span>
          Época {(active ?? latest).point.epoch} · pérdida{' '}
          <b className="chart__metric chart__metric--loss">{formatLoss((active ?? latest).point.loss)}</b>{' '}
          · val{' '}
          <b className="chart__metric chart__metric--loss">
            {formatLoss((active ?? latest).point.valLoss)}
          </b>
        </span>
        <strong>
          ganancia {formatRate((active ?? latest).point.accuracy)} · val{' '}
          {formatRate((active ?? latest).point.valAccuracy)}
        </strong>
      </div>
    </div>
  );
}
