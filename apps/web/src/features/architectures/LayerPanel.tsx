import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import type { NetworkFamily } from '@/types/domain';
import { NumberField } from '@/features/architectures/fields';
import {
  formatShape,
  layerCatalog,
  layerSummary,
  type InputConfig,
  type LayerConfig,
  type LayerType,
} from '@/features/architectures/model';

export interface LayerPanelProps {
  layers: LayerConfig[];
  selectedId: string | null;
  allowed: LayerType[];
  inputShape: number[];
  outputShape: number[];
  onSelect: (id: string) => void;
  onAdd: (type: LayerType) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

export function LayerPanel({
  layers,
  selectedId,
  allowed,
  inputShape,
  outputShape,
  onSelect,
  onAdd,
  onMove,
  onRemove,
}: LayerPanelProps) {
  return (
    <Panel
      title="Capas"
      icon="layers"
      subtitle={`${layers.length} ${layers.length === 1 ? 'capa' : 'capas'} en secuencia`}
      footer={
        <>
          <span>
            Entrada <strong className="u-mono">{formatShape(inputShape)}</strong>
          </span>
          <span>
            Salida <strong className="u-mono">{formatShape(outputShape)}</strong>
          </span>
        </>
      }
    >
      <p className="arch-subhead">Añadir capa</p>
      <div className="arch-palette">
        {allowed.map((type) => (
          <button
            key={type}
            type="button"
            className="arch-palette__btn"
            title={layerCatalog[type].hint}
            onClick={() => onAdd(type)}
          >
            <Icon name="plus" size={12} />
            {layerCatalog[type].label}
          </button>
        ))}
      </div>

      <p className="arch-subhead">Secuencia del modelo</p>
      {layers.length === 0 ? (
        <p className="arch-mini">Añade una capa desde la paleta para comenzar.</p>
      ) : (
        <ul className="arch-layerlist">
          {layers.map((layer, index) => (
            <li className="arch-layer" data-active={selectedId === layer.id} key={layer.id}>
              <button type="button" className="arch-layer__main" onClick={() => onSelect(layer.id)}>
                <span className="arch-layer__index">{index + 1}</span>
                <span className="arch-layer__text">
                  <strong>{layerCatalog[layer.type].label}</strong>
                  <span>{layerSummary(layer)}</span>
                </span>
              </button>
              <span className="arch-layer__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Subir ${layerCatalog[layer.type].label}`}
                  disabled={index === 0}
                  onClick={() => onMove(layer.id, -1)}
                >
                  <Icon name="chevronDown" size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Bajar ${layerCatalog[layer.type].label}`}
                  disabled={index === layers.length - 1}
                  onClick={() => onMove(layer.id, 1)}
                >
                  <Icon name="chevronDown" size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Eliminar ${layerCatalog[layer.type].label}`}
                  onClick={() => onRemove(layer.id)}
                >
                  <Icon name="close" size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export interface InputPanelProps {
  family: NetworkFamily;
  input: InputConfig;
  onChange: (key: keyof InputConfig, value: number) => void;
}

export function InputPanel({ family, input, onChange }: InputPanelProps) {
  return (
    <Panel
      title="Entrada del tensor"
      icon="dataset"
      subtitle="Forma que recibe la primera capa."
    >
      <div className="arch-form">
        {family === 'FEEDFORWARD' ? (
          <NumberField
            label="Características"
            value={input.features}
            onChange={(value) => onChange('features', value)}
            wide
          />
        ) : null}

        {family === 'RNN' ? (
          <>
            <NumberField
              label="Pasos temporales"
              value={input.timesteps}
              onChange={(value) => onChange('timesteps', value)}
            />
            <NumberField
              label="Características por paso"
              value={input.seqFeatures}
              onChange={(value) => onChange('seqFeatures', value)}
            />
          </>
        ) : null}

        {family === 'CNN' ? (
          <>
            <NumberField
              label="Alto (px)"
              value={input.height}
              onChange={(value) => onChange('height', value)}
            />
            <NumberField
              label="Ancho (px)"
              value={input.width}
              onChange={(value) => onChange('width', value)}
            />
            <NumberField
              label="Canales"
              value={input.channels}
              onChange={(value) => onChange('channels', value)}
              wide
            />
          </>
        ) : null}

        {family === 'GAN' ? (
          <NumberField
            label="Vector latente"
            value={input.latent}
            onChange={(value) => onChange('latent', value)}
            wide
          />
        ) : null}
      </div>
    </Panel>
  );
}
