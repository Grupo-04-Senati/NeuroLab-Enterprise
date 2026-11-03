import { Icon, type IconName } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import {
  formatParams,
  formatShape,
  layerTitle,
  type ArchitectureComputation,
  type IssueSeverity,
} from '@/features/architectures/model';

const SEVERITY_ICON: Record<IssueSeverity, IconName> = {
  error: 'alertCircle',
  warning: 'alertTriangle',
  info: 'info',
};

export interface SummaryPanelProps {
  computation: ArchitectureComputation;
  onRemoveConnection: (id: string) => void;
}

export function SummaryPanel({ computation, onRemoveConnection }: SummaryPanelProps) {
  const { issues, connections, results } = computation;
  const errors = issues.filter((issue) => issue.severity === 'error').length;

  return (
    <Panel
      title="Resumen y validación"
      icon="metrics"
      subtitle="Formas, parámetros y conexiones del grafo."
      footer={
        <>
          <span>
            {errors === 0 ? 'Sin bloqueos' : `${errors} ${errors === 1 ? 'error' : 'errores'}`}
          </span>
          <span>
            {connections.length} {connections.length === 1 ? 'conexión' : 'conexiones'}
          </span>
        </>
      }
    >
      <dl className="arch-stats">
        <div>
          <dt>Parámetros</dt>
          <dd>{formatParams(computation.totalParams)}</dd>
        </div>
        <div>
          <dt>Capas</dt>
          <dd>{results.length}</dd>
        </div>
        <div>
          <dt>Entrada</dt>
          <dd>{formatShape(computation.inputShape)}</dd>
        </div>
        <div>
          <dt>Salida</dt>
          <dd>{formatShape(computation.outputShape)}</dd>
        </div>
      </dl>

      <p className="arch-subhead">Validación</p>
      {issues.length === 0 ? (
        <ul className="arch-issues">
          <li data-severity="ok">
            <Icon name="checkCircle" size={15} />
            Configuración válida: formas compatibles y capa de salida definida.
          </li>
        </ul>
      ) : (
        <ul className="arch-issues">
          {issues.map((issue) => (
            <li key={issue.id} data-severity={issue.severity}>
              <Icon name={SEVERITY_ICON[issue.severity]} size={15} />
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      <p className="arch-subhead">Conexiones neuronales</p>
      {connections.length === 0 ? (
        <p className="arch-mini">
          Aún no hay enlaces manuales. Activa el modo Conectar y une dos neuronas de capas
          adyacentes.
        </p>
      ) : (
        <ul className="arch-conns">
          {connections.map((connection) => {
            const fromLayer = results[connection.from.layer];
            const toLayer = results[connection.to.layer];
            const label = `${fromLayer ? layerTitle(fromLayer.layer) : 'Capa'} · N${
              connection.from.neuron + 1
            } → ${toLayer ? layerTitle(toLayer.layer) : 'Capa'} · N${connection.to.neuron + 1}`;
            return (
              <li key={connection.id}>
                <span>{label}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Quitar conexión ${label}`}
                  onClick={() => onRemoveConnection(connection.id)}
                >
                  <Icon name="close" size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
