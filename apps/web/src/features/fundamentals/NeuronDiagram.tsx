import { useState } from 'react';

type PartId = 'entradas' | 'pesos' | 'sesgo' | 'suma' | 'activacion' | 'salida';

interface NeuronPart {
  id: PartId;
  label: string;
  symbol: string;
  detail: string;
}

const PARTS: NeuronPart[] = [
  {
    id: 'entradas',
    label: 'Entradas',
    symbol: 'x₁ x₂ x₃',
    detail:
      'Valores de la muestra: una columna del dataset ya codificada y escalada. La red no interpreta su significado, solo los propaga.',
  },
  {
    id: 'pesos',
    label: 'Pesos',
    symbol: 'w₁ w₂ w₃',
    detail:
      'Un peso por conexión. Multiplica la entrada de origen y fija cuánto pesa esa señal en la neurona destino; es lo que se aprende.',
  },
  {
    id: 'sesgo',
    label: 'Sesgo',
    symbol: 'b',
    detail:
      'Suma constante que desplaza el punto de activación. Sin sesgo, la recta de decisión estaría forzada a pasar por el origen.',
  },
  {
    id: 'suma',
    label: 'Suma ponderada',
    symbol: 'z = Σ wᵢx + b',
    detail: 'La neurona acumula las señales entrantes ya escaladas por sus pesos y añade el sesgo.',
  },
  {
    id: 'activacion',
    label: 'Activación',
    symbol: 'f(z)',
    detail:
      'Función no lineal aplicada a z. Aporta la capacidad de representar fronteras de decisión curvas capa tras capa.',
  },
  {
    id: 'salida',
    label: 'Salida',
    symbol: 'a',
    detail: 'Valor que viaja hacia la siguiente capa o que se interpreta como predicción en la capa final.',
  },
];

const INPUT_Y = [46, 130, 214];
const SUBSCRIPT = ['₁', '₂', '₃'];

/** Neurona artificial: cada parte es consultable y se resalta en el diagrama. */
export function NeuronDiagram() {
  const [active, setActive] = useState<PartId>('suma');

  const tone = (part: PartId) => (active === part ? 'is-active' : 'is-muted');

  return (
    <div className="fund-neuron">
      <svg
        className="fund-neuron__svg"
        viewBox="0 0 560 260"
        role="img"
        aria-label="Diagrama de una neurona artificial: tres entradas ponderadas, suma con sesgo, función de activación y salida"
      >
        <g className={`fund-edge ${tone('pesos')}`}>
          {INPUT_Y.map((y, index) => (
            <g key={index}>
              <line x1={92} y1={y} x2={228} y2={130} vectorEffect="non-scaling-stroke" />
              <text x={164} y={(y + 130) / 2 - 8} textAnchor="middle">
                {`w${SUBSCRIPT[index]}`}
              </text>
            </g>
          ))}
        </g>

        <g className={`fund-node fund-node--input ${tone('entradas')}`}>
          {INPUT_Y.map((y, index) => (
            <g key={index}>
              <circle cx={64} cy={y} r={26} />
              <text x={64} y={y + 5} textAnchor="middle">
                {`x${SUBSCRIPT[index]}`}
              </text>
            </g>
          ))}
        </g>

        <g className={`fund-bias ${tone('sesgo')}`}>
          <line x1={250} y1={72} x2={250} y2={102} vectorEffect="non-scaling-stroke" />
          <circle cx={250} cy={50} r={20} />
          <text x={250} y={55} textAnchor="middle">
            b
          </text>
        </g>

        <g className={`fund-sum ${tone('suma')}`}>
          <circle cx={250} cy={130} r={30} />
          <text x={250} y={138} textAnchor="middle">
            Σ
          </text>
        </g>

        <line
          className="fund-flow"
          x1={282}
          y1={130}
          x2={326}
          y2={130}
          vectorEffect="non-scaling-stroke"
        />

        <g className={`fund-block ${tone('activacion')}`}>
          <rect x={330} y={98} width={112} height={64} rx={12} />
          <text x={386} y={126} textAnchor="middle" className="fund-block__fn">
            f(z)
          </text>
          <text x={386} y={146} textAnchor="middle" className="fund-block__hint">
            activación
          </text>
        </g>

        <line
          className="fund-flow"
          x1={444}
          y1={130}
          x2={482}
          y2={130}
          vectorEffect="non-scaling-stroke"
        />

        <g className={`fund-node fund-node--output ${tone('salida')}`}>
          <circle cx={508} cy={130} r={26} />
          <text x={508} y={135} textAnchor="middle">
            a
          </text>
        </g>
      </svg>

      <div className="fund-parts" role="group" aria-label="Partes de la neurona">
        {PARTS.map((part) => (
          <button
            key={part.id}
            type="button"
            className="fund-part"
            aria-pressed={active === part.id}
            onClick={() => setActive(part.id)}
          >
            <strong>{part.label}</strong>
            <span className="u-mono">{part.symbol}</span>
          </button>
        ))}
      </div>

      <p className="fund-part__detail" aria-live="polite">
        {PARTS.find((part) => part.id === active)?.detail}
      </p>
    </div>
  );
}
