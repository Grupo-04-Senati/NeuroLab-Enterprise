import { useState } from 'react';
import {
  LAYER_ROLES,
  NETWORK_SHAPE,
  connectionCount,
  neuronCount,
  type LayerRoleId,
} from '@/features/fundamentals/content';

const VB = { width: 560, height: 268 };
const LAYER_X = [72, 226, 372, 500];

function roleOf(index: number, total: number): LayerRoleId {
  if (index === 0) return 'entrada';
  if (index === total - 1) return 'salida';
  return 'oculta';
}

function neuronYs(count: number): number[] {
  const gap = Math.min(58, (VB.height - 76) / Math.max(1, count - 1));
  const height = gap * (count - 1);
  return Array.from({ length: count }, (_, index) => VB.height / 2 - height / 2 + index * gap);
}

const LAYER_NEURONS = NETWORK_SHAPE.map((count) => neuronYs(count));

/** Pila de capas feedforward: el diagrama se explora por tipo de capa. */
export function LayerAnatomy() {
  const [role, setRole] = useState<LayerRoleId>('oculta');
  const info = LAYER_ROLES.find((layer) => layer.id === role) ?? LAYER_ROLES[0];
  const connections = connectionCount(NETWORK_SHAPE);

  return (
    <div className="fund-layers">
      <div className="fund-layers__nav" role="group" aria-label="Tipos de capa">
        {LAYER_ROLES.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className="fund-part"
            aria-pressed={role === layer.id}
            onClick={() => setRole(layer.id)}
          >
            <strong>{layer.name}</strong>
            <span>{layer.index}</span>
          </button>
        ))}
      </div>

      <svg
        className="fund-layers__svg"
        viewBox={`0 0 ${VB.width} ${VB.height}`}
        role="img"
        aria-label={`Red de alimentación hacia adelante de ${NETWORK_SHAPE.length} capas con forma ${NETWORK_SHAPE.join(
          ' por ',
        )} y ${connections} conexiones`}
      >
        <g className="fund-layers__edges">
          {NETWORK_SHAPE.slice(0, -1).map((count, layerIndex) =>
            Array.from({ length: count }, (_, from) =>
              Array.from({ length: NETWORK_SHAPE[layerIndex + 1] }, (_, to) => {
                const source = roleOf(layerIndex, NETWORK_SHAPE.length) === role;
                const target = roleOf(layerIndex + 1, NETWORK_SHAPE.length) === role;
                return (
                  <line
                    key={`${layerIndex}-${from}-${to}`}
                    className={source || target ? 'is-active' : 'is-muted'}
                    x1={LAYER_X[layerIndex] + 24}
                    y1={LAYER_NEURONS[layerIndex][from]}
                    x2={LAYER_X[layerIndex + 1] - 24}
                    y2={LAYER_NEURONS[layerIndex + 1][to]}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }),
            ),
          )}
        </g>

        {NETWORK_SHAPE.map((_, layerIndex) => {
          const matches = roleOf(layerIndex, NETWORK_SHAPE.length) === role;
          return (
            <g
              key={layerIndex}
              className={`fund-layer fund-layer--${roleOf(layerIndex, NETWORK_SHAPE.length)} ${
                matches ? 'is-active' : 'is-muted'
              }`}
            >
              {LAYER_NEURONS[layerIndex].map((y, neuron) => (
                <circle key={neuron} cx={LAYER_X[layerIndex]} cy={y} r={22} />
              ))}
              <text x={LAYER_X[layerIndex]} y={VB.height - 10} textAnchor="middle" className="fund-layer__caption">
                {`capa ${layerIndex}`}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="fund-layers__facts" aria-live="polite">
        <p className="fund-layers__detail">
          <strong>{info.name}</strong> · {info.detail}
        </p>
        <ul className="fund-duties">
          {info.duties.map((duty) => (
            <li key={duty}>{duty}</li>
          ))}
        </ul>
        <p className="fund-layers__example">
          Ejemplo: <span className="u-mono">{info.example}</span>
        </p>
      </div>

      <p className="fund-layers__meta">
        {NETWORK_SHAPE.length} capas · {neuronCount(NETWORK_SHAPE)} neuronas · {connections} conexiones
        densas · {NETWORK_SHAPE.join(' → ')}
      </p>
    </div>
  );
}
