import { useMemo, useState } from 'react';
import { ACTIVATIONS, RISK_LABELS, type ActivationFunction } from '@/features/fundamentals/content';
import { formatNumber } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';

const VB = { width: 560, height: 232 };
const PAD = { top: 14, right: 14, bottom: 26, left: 40 };
const X_MIN = -6;
const X_MAX = 6;
const SAMPLES = 121;

function useCurve(fn: ActivationFunction) {
  return useMemo(() => {
    const points = Array.from({ length: SAMPLES }, (_, index) => {
      const x = X_MIN + ((X_MAX - X_MIN) * index) / (SAMPLES - 1);
      return { x, y: fn.evaluate(x) };
    });
    const rawMin = Math.min(...points.map((point) => point.y));
    const rawMax = Math.max(...points.map((point) => point.y));
    const pad = Math.max((rawMax - rawMin) * 0.12, 0.35);
    const yMin = rawMin - pad;
    const yMax = rawMax + pad;

    const innerW = VB.width - PAD.left - PAD.right;
    const innerH = VB.height - PAD.top - PAD.bottom;
    const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * innerW;
    const toY = (y: number) => PAD.top + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

    return {
      line: points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.x).toFixed(1)},${toY(point.y).toFixed(1)}`).join(' '),
      zeroY: yMin < 0 && yMax > 0 ? toY(0) : null,
      zeroX: toX(0),
      origin: { x: toX(0), y: toY(fn.evaluate(0)) },
      ticks: [
        { value: X_MIN, x: toX(X_MIN) },
        { value: 0, x: toX(0) },
        { value: X_MAX, x: toX(X_MAX) },
      ],
      bounds: [
        { label: formatNumber(rawMax, 1), y: toY(rawMax) },
        { label: formatNumber(rawMin, 1), y: toY(rawMin) },
      ],
    };
  }, [fn]);
}

/** Comparador de funciones de activación: curva, rango y riesgos del §6 M03. */
export function ActivationExplorer() {
  const [activeId, setActiveId] = useState(ACTIVATIONS[2].id);
  const fn = ACTIVATIONS.find((item) => item.id === activeId) ?? ACTIVATIONS[0];
  const curve = useCurve(fn);

  return (
    <div className="fund-activation">
      <div className="fund-activation__picker" role="group" aria-label="Funciones de activación">
        {ACTIVATIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="fund-chip"
            aria-pressed={item.id === activeId}
            onClick={() => setActiveId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="fund-activation__body">
        <svg
          className="fund-plot"
          viewBox={`0 0 ${VB.width} ${VB.height}`}
          role="img"
          aria-label={`Curva de la función ${fn.name} en el intervalo ${X_MIN} a ${X_MAX}`}
        >
          {curve.zeroY === null ? null : (
            <line className="fund-plot__axis" x1={PAD.left} x2={VB.width - PAD.right} y1={curve.zeroY} y2={curve.zeroY} />
          )}
          <line className="fund-plot__axis" x1={curve.zeroX} x2={curve.zeroX} y1={PAD.top} y2={VB.height - PAD.bottom} />

          {curve.ticks.map((tick) => (
            <text key={tick.value} className="fund-plot__tick" x={tick.x} y={VB.height - 8} textAnchor="middle">
              {tick.value}
            </text>
          ))}
          {curve.bounds.map((bound) => (
            <text key={bound.label} className="fund-plot__tick" x={6} y={bound.y + 3.5}>
              {bound.label}
            </text>
          ))}

          <path className="fund-plot__curve" d={curve.line} vectorEffect="non-scaling-stroke" />
          <circle className="fund-plot__dot" cx={curve.origin.x} cy={curve.origin.y} r={4.5} />
        </svg>

        <dl className="fund-facts">
          <div>
            <dt>Fórmula</dt>
            <dd className="u-mono">{fn.formula}</dd>
          </div>
          <div>
            <dt>Rango</dt>
            <dd>{fn.range}</dd>
          </div>
          <div>
            <dt>Pendiente en z = 0</dt>
            <dd>{formatNumber(fn.slopeAtZero, 2)}</dd>
          </div>
          <div>
            <dt>f(0)</dt>
            <dd>{formatNumber(fn.evaluate(0), 3)}</dd>
          </div>
          <div>
            <dt>Salida</dt>
            <dd>{fn.bounded ? 'Acotada' : 'No acotada'}</dd>
          </div>
          <div>
            <dt>Riesgos</dt>
            <dd>
              {fn.risks.length
                ? fn.risks.map((risk) => (
                    <Chip key={risk} tone={risk === 'dead' ? 'failed' : 'preparing'}>
                      {RISK_LABELS[risk]}
                    </Chip>
                  ))
                : 'Ninguno relevante'}
            </dd>
          </div>
        </dl>
      </div>

      <p className="fund-activation__uses">
        <strong>Uso habitual.</strong> {fn.uses}
      </p>
      <ul className="fund-duties">
        {fn.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p className="fund-activation__note">{fn.plotNote}</p>
    </div>
  );
}
