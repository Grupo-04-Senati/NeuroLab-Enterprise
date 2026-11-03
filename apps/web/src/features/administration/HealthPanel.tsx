import type { ServiceHealth } from '@/types/administration';
import { formatRelativeTime } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { serviceStatusMeta } from '@/features/administration/model';

interface HealthPanelProps {
  services: ServiceHealth[];
  checkedAt: string;
  onRefresh: () => void;
}

export function HealthPanel({ services, checkedAt, onRefresh }: HealthPanelProps) {
  const degraded = services.filter((service) => service.status !== 'HEALTHY').length;
  const healthy = services.length - degraded;

  return (
    <div className="adm-embedded">
      <div className="adm-health-toolbar">
        <Chip tone={degraded > 0 ? 'preparing' : 'completed'} dot>
          {healthy} operativos · {degraded} con avisos
        </Chip>
        <span className="adm-health-toolbar__time">
          Última comprobación {formatRelativeTime(checkedAt)}
        </span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRefresh}>
          <Icon name="refresh" size={14} />
          Verificar
        </button>
      </div>

      <ul className="adm-health" aria-label="Servicios de la plataforma">
        {services.map((service) => {
          const meta = serviceStatusMeta[service.status];
          return (
            <li key={service.id} className="adm-service" data-status={service.status}>
              <span className="adm-service__dot" aria-hidden="true" />
              <div className="adm-service__body">
                <strong>{service.label}</strong>
                <span>{service.detail}</span>
              </div>
              <div className="adm-service__meta">
                <Chip tone={meta.tone} dot>
                  {meta.label}
                </Chip>
                <span className="u-mono">
                  {service.latencyMs === null ? '—' : `${service.latencyMs} ms`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="panel__note adm-health-note">
        Umbrales de referencia: API &lt; 250 ms, base de datos &lt; 40 ms y workers al menos 4 en
        línea. Un servicio degradado no bloquea la consola, pero sí puede retrasar la cola.
      </p>
    </div>
  );
}
