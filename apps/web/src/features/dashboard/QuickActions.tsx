import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/Panel';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Action {
  label: string;
  hint: string;
  to: string;
  icon: IconName;
}

/** Pasos del flujo principal (§4.3 del Documento Maestro). */
const ACTIONS: Action[] = [
  { label: 'Crear proyecto', hint: 'Defina el problema a resolver', to: '/projects', icon: 'plus' },
  { label: 'Cargar dataset CSV', hint: 'Validación de esquema obligatoria', to: '/datasets', icon: 'upload' },
  { label: 'Diseñar arquitectura', hint: 'Capas, activaciones y salida', to: '/architectures', icon: 'layers' },
  { label: 'Iniciar entrenamiento', hint: 'Se envía a la cola de workers', to: '/training', icon: 'training' },
];

export function QuickActions() {
  return (
    <Panel
      title="Iniciar un ciclo de experimentación"
      subtitle="Atajos del flujo principal: proyecto → dataset → arquitectura → entrenamiento."
      icon="zap"
    >
      <div className="quick-grid">
        {ACTIONS.map((action) => (
          <Link to={action.to} className="quick" key={action.label}>
            <span className="quick__icon">
              <Icon name={action.icon} size={18} />
            </span>
            <span className="quick__text">
              <strong>{action.label}</strong>
              <span>{action.hint}</span>
            </span>
            <Icon className="quick__arrow" name="arrowRight" size={16} />
          </Link>
        ))}
      </div>
    </Panel>
  );
}
