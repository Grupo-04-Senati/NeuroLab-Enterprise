import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { NumberField, SelectField } from '@/features/architectures/fields';
import {
  ACTIVATION_OPTIONS,
  formatParams,
  formatShape,
  layerCatalog,
  type Activation,
  type LayerConfig,
  type LayerResult,
} from '@/features/architectures/model';

const ACTIVATION_TYPES = new Set(['Dense', 'Conv2D', 'LSTM', 'GRU']);
const UNIT_TYPES = new Set(['Dense', 'LSTM', 'GRU']);

export interface PropertiesPanelProps {
  layer: LayerConfig | null;
  index: number;
  total: number;
  result?: LayerResult;
  onChange: (id: string, patch: Partial<LayerConfig>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

export function PropertiesPanel({
  layer,
  index,
  total,
  result,
  onChange,
  onMove,
  onRemove,
}: PropertiesPanelProps) {
  return (
    <Panel
      title="Propiedades"
      icon="settings"
      subtitle={layer ? `Capa ${index + 1} · ${layerCatalog[layer.type].label}` : 'Selecciona una capa'}
    >
      {!layer || index < 0 ? (
        <div className="empty">
          <Icon name="settings" size={30} />
          <h3>Sin capa seleccionada</h3>
          <p>Elige una capa en la lista o en el lienzo para editar sus parámetros.</p>
        </div>
      ) : (
        <>
          <div className="arch-facts">
            <span>
              Salida <strong className="u-mono">{formatShape(result?.outputShape ?? [])}</strong>
            </span>
            <span>
              Parámetros <strong className="u-mono">{formatParams(result?.params ?? 0)}</strong>
            </span>
          </div>

          <div className="arch-form">
            {UNIT_TYPES.has(layer.type) ? (
              <NumberField
                label={layer.type === 'Dense' ? 'Unidades' : 'Celdas'}
                value={layer.units ?? 0}
                onChange={(value) => onChange(layer.id, { units: value })}
              />
            ) : null}

            {layer.type === 'Conv2D' ? (
              <>
                <NumberField
                  label="Filtros"
                  value={layer.filters ?? 0}
                  onChange={(value) => onChange(layer.id, { filters: value })}
                />
                <NumberField
                  label="Kernel"
                  value={layer.kernelSize ?? 3}
                  onChange={(value) => onChange(layer.id, { kernelSize: value })}
                />
              </>
            ) : null}

            {layer.type === 'MaxPooling2D' ? (
              <NumberField
                label="Tamaño de pool"
                value={layer.poolSize ?? 2}
                onChange={(value) => onChange(layer.id, { poolSize: value })}
              />
            ) : null}

            {layer.type === 'Dropout' ? (
              <NumberField
                label="Tasa de descarte"
                value={layer.dropout ?? 0}
                min={0}
                max={0.9}
                step={0.05}
                wide
                onChange={(value) => onChange(layer.id, { dropout: value })}
              />
            ) : null}

            {ACTIVATION_TYPES.has(layer.type) ? (
              <SelectField
                label="Activación"
                value={layer.activation ?? 'relu'}
                options={ACTIVATION_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) => onChange(layer.id, { activation: value as Activation })}
              />
            ) : null}

            {layer.type === 'Flatten' || layer.type === 'BatchNormalization' ? (
              <p className="arch-note arch-field--wide">
                Esta capa no expone parámetros editables; su efecto se refleja en la forma de
                salida.
              </p>
            ) : null}
          </div>

          <div className="arch-layer-actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={index === 0}
              onClick={() => onMove(layer.id, -1)}
            >
              <Icon name="chevronDown" size={13} style={{ transform: 'rotate(180deg)' }} />
              Subir
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={index === total - 1}
              onClick={() => onMove(layer.id, 1)}
            >
              <Icon name="chevronDown" size={13} />
              Bajar
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm arch-danger"
              onClick={() => onRemove(layer.id)}
            >
              <Icon name="close" size={13} />
              Eliminar
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
