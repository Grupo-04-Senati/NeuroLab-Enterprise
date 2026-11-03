import type { PlatformAlert } from '@/types/domain';
import { formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';

const ICON_BY_SEVERITY: Record<PlatformAlert['severity'], IconName> = {
  high: 'alertTriangle',
  medium: 'alertCircle',
  info: 'info',
};

const LABEL_BY_SEVERITY: Record<PlatformAlert['severity'], string> = {
  high: 'Crítica',
  medium: 'Atención',
  info: 'Informativa',
};

export function AlertFeed({ alerts }: { alerts: PlatformAlert[] }) {
  const critical = alerts.filter((alert) => alert.severity === 'high').length;

  return (
    <div id="alerts">
      <Panel
        title="Alertas y uso de recursos"
        subtitle="Indicadores que requieren acción del equipo antes de aprobar una versión de modelo."
        icon="bell"
        body="tight"
        actions={
          <Chip tone={critical > 0 ? 'failed' : 'neutral'} dot>
            {alerts.length} abiertas
          </Chip>
        }
        footer={
          <>
            <span>Se registran en auditoría según el rol del actor (M10).</span>
            <a href="/admin">Ver auditoría</a>
          </>
        }
      >
        <ul>
          {alerts.map((alert) => (
            <li className="alert-item" data-severity={alert.severity} key={alert.id}>
              <span className="alert-item__icon">
                <Icon name={ICON_BY_SEVERITY[alert.severity]} size={16} />
              </span>
              <div className="alert-item__body">
                <p className="alert-item__title">{alert.title}</p>
                <p className="alert-item__desc">{alert.description}</p>
                <p className="alert-item__time">
                  {LABEL_BY_SEVERITY[alert.severity]} · {alert.module} ·{' '}
                  {formatRelativeTime(alert.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
