import { Link, useLocation } from 'react-router-dom';
import { findNavItem } from '@/lib/nav';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';

/** Alcance declarado por módulo en el §6 del Documento Maestro. */
const SCOPE: Record<string, string[]> = {
  M02: ['Listado, búsqueda y filtros', 'Crear/editar proyecto', 'Miembros, permisos y estado', 'Documentación y etiquetas'],
  M03: ['Conceptos de red neuronal', 'Neuronas, capas y conexiones', 'Pesos, sesgos y funciones de activación', 'Glosario y ejemplos guiados'],
  M04: ['Selector de familia: Feedforward, RNN, CNN, GAN', 'Editor de capas y parámetros', 'Validación de formas de entrada/salida', 'Vista previa del grafo y resumen de parámetros'],
  M05: ['Registro de dataset y metadatos', 'Carga controlada y validación', 'Separación entrenamiento/validación/prueba', 'Versionado, permisos y eliminación segura'],
  M06: ['Configuración de épocas, batch size y optimizador', 'Cola y prioridad por permisos', 'Inicio, cancelación y reintento', 'Progreso en tiempo real'],
  M07: ['Pérdida y métricas por época', 'Evaluación final', 'Gráficos y comparación de ejecuciones', 'Registro de limitaciones y observaciones'],
  M08: ['Versiones inmutables', 'Metadatos de entrenamiento', 'Estado borrador/revisado/aprobado/retirado', 'Descarga/exportación autorizada'],
  M09: ['Ficha de proyecto', 'Resumen de arquitectura', 'Historial de entrenamiento', 'Exportación CSV/PDF según permisos'],
  M10: ['Usuarios, roles y permisos', 'Auditoría de acciones', 'Límites de recursos', 'Configuración, salud del sistema y retención'],
};

const PHASES: Record<string, string> = {
  M02: 'Fase 1 · Base de plataforma',
  M03: 'Fase 2 · Arquitecturas',
  M04: 'Fase 2 · Arquitecturas',
  M05: 'Fase 3 · Entrenamiento',
  M06: 'Fase 3 · Entrenamiento',
  M07: 'Fase 4 · Tiempo real y evaluación',
  M08: 'Fase 5 · Model registry y reportes',
  M09: 'Fase 5 · Model registry y reportes',
  M10: 'Fase 6 · Endurecimiento y despliegue',
};

export function ModulePlaceholder() {
  const { pathname } = useLocation();
  const entry = findNavItem(pathname);
  const scope = entry ? SCOPE[entry.moduleId] ?? [] : [];

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name={entry?.icon ?? 'layers'} size={14} strokeWidth={2} />
            {entry?.moduleId ?? 'Módulo'} · {entry?.label ?? 'En construcción'}
          </p>
          <h1 className="page-head__title">{entry?.label ?? 'Módulo no registrado'}</h1>
          <p className="page-head__lede">
            El módulo está definido en la especificación y forma parte del plan de implementación por
            fases; su interfaz y sus endpoints se construyen sobre la base que entrega el M01.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/" className="btn btn--primary">
            <Icon name="dashboard" size={16} />
            Volver al panel
          </Link>
        </div>
      </div>

      <div className="dash">
        <Panel
          title="Alcance funcional"
          subtitle={PHASES[entry?.moduleId ?? ''] ?? 'Sin fase asignada'}
          icon="layers"
          actions={<Chip tone="preparing">Pendiente de desarrollo</Chip>}
        >
          <ul className="scope-list">
            {scope.map((item) => (
              <li key={item}>
                <Icon name="checkCircle" size={16} />
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Dependencias del módulo" icon="server">
          <p className="panel__note">
            Este módulo consume los contratos REST de <code>services/api</code> y, cuando corresponde,
            el canal de eventos de <code>workers/training</code>. Ningún cálculo de TensorFlow se
            ejecuta dentro del navegador ni del proceso de la API (RN-03).
          </p>
          <div className="quick-grid" style={{ marginTop: 'var(--sp-4)' }}>
            <Link to="/" className="quick">
              <span className="quick__icon">
                <Icon name="dashboard" size={18} />
              </span>
              <span className="quick__text">
                <strong>M01 · Inicio</strong>
                <span>Disponible</span>
              </span>
              <Icon className="quick__arrow" name="arrowRight" size={16} />
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
