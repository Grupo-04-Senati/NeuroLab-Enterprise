import { useMemo, useState } from 'react';
import {
  ACTIVATIONS,
  DEFAULT_EXAMPLE,
  computeNeuron,
  type ActivationFunction,
} from '@/features/fundamentals/content';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

const SUBSCRIPT = ['₁', '₂', '₃'];

interface SliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ id, label, value, onChange }: SliderProps) {
  return (
    <div className="fund-slider">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={-2}
        max={2}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id} className="u-mono u-num">
        {formatNumber(value, 2)}
      </output>
    </div>
  );
}

/**
 * Ejemplo guiado: recorre el mismo cálculo que una unidad Dense de Keras,
 * paso a paso, para que el resultado sea verificable a mano.
 */
export function NeuronCalculator() {
  const [inputs, setInputs] = useState<number[]>(DEFAULT_EXAMPLE.inputs);
  const [weights, setWeights] = useState<number[]>(DEFAULT_EXAMPLE.weights);
  const [bias, setBias] = useState(DEFAULT_EXAMPLE.bias);
  const [activationId, setActivationId] = useState(DEFAULT_EXAMPLE.activationId);

  const activation: ActivationFunction =
    ACTIVATIONS.find((item) => item.id === activationId) ?? ACTIVATIONS[0];
  const result = useMemo(
    () => computeNeuron(inputs, weights, bias, activation),
    [inputs, weights, bias, activation],
  );

  const setAt = (list: number[], index: number, value: number) =>
    list.map((item, position) => (position === index ? value : item));

  const reset = () => {
    setInputs(DEFAULT_EXAMPLE.inputs);
    setWeights(DEFAULT_EXAMPLE.weights);
    setBias(DEFAULT_EXAMPLE.bias);
    setActivationId(DEFAULT_EXAMPLE.activationId);
  };

  return (
    <div className="fund-calc">
      <div className="fund-calc__controls">
        <p className="fund-calc__legend u-caps">Entradas de la muestra</p>
        {inputs.map((value, index) => (
          <Slider
            key={`in-${index}`}
            id={`fund-input-${index}`}
            label={`x${SUBSCRIPT[index]}`}
            value={value}
            onChange={(next) => setInputs((list) => setAt(list, index, next))}
          />
        ))}

        <p className="fund-calc__legend u-caps">Pesos aprendidos</p>
        {weights.map((value, index) => (
          <Slider
            key={`w-${index}`}
            id={`fund-weight-${index}`}
            label={`w${SUBSCRIPT[index]}`}
            value={value}
            onChange={(next) => setWeights((list) => setAt(list, index, next))}
          />
        ))}

        <p className="fund-calc__legend u-caps">Sesgo de la neurona</p>
        <Slider id="fund-bias" label="b" value={bias} onChange={setBias} />

        <p className="fund-calc__legend u-caps">Función de activación</p>
        <div className="fund-activation__picker" role="group" aria-label="Activación del ejemplo">
          {ACTIVATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="fund-chip"
              aria-pressed={item.id === activationId}
              onClick={() => setActivationId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
          <Icon name="refresh" size={14} />
          Restablecer el ejemplo
        </button>
      </div>

      <ol className="fund-steps">
        {result.products.map((product, index) => (
          <li key={index} className="fund-step">
            <span className="fund-step__label">
              Conexión {`x${SUBSCRIPT[index]} → w${SUBSCRIPT[index]}`}
            </span>
            <span className="fund-step__expr u-mono">
              {formatNumber(product.input, 2)} × {formatNumber(product.weight, 2)}
            </span>
            <strong className="fund-step__value u-num">{formatNumber(product.value, 3)}</strong>
          </li>
        ))}

        <li className="fund-step fund-step--total">
          <span className="fund-step__label">Suma ponderada</span>
          <span className="fund-step__expr u-mono">Σ wᵢxᵢ</span>
          <strong className="fund-step__value u-num">{formatNumber(result.weightedSum, 3)}</strong>
        </li>

        <li className="fund-step fund-step--total">
          <span className="fund-step__label">Añadir el sesgo</span>
          <span className="fund-step__expr u-mono">
            {formatNumber(result.weightedSum, 3)} + {formatNumber(result.bias, 2)}
          </span>
          <strong className="fund-step__value u-num">z = {formatNumber(result.z, 3)}</strong>
        </li>

        <li className="fund-step fund-step--result">
          <span className="fund-step__label">Aplicar {activation.name}</span>
          <span className="fund-step__expr u-mono">a = f(z)</span>
          <strong className="fund-step__value u-num">{formatNumber(result.output, 4)}</strong>
        </li>
      </ol>

      <p className="fund-calc__read">
        {activation.risks.includes('dead') && result.z <= 0
          ? 'Con z negativa ReLU devuelve 0: la neurona no aporta y tampoco recibe gradiente en esa época.'
          : activation.bounded
            ? `La salida ya está acotada en ${activation.range}, así que se interpreta directamente como activación de la neurona.`
            : 'La activación no está acotada: la siguiente capa recibe el valor sin comprimir.'}
      </p>
    </div>
  );
}
