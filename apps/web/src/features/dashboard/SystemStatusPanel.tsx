import type { SystemHealth } from '@/types/domain';
import { formatNumber, percentage } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Meter } from '@/components/ui/Progress';
import { Icon, type IconName } from '@/components/ui/Icon';

function StatusLine({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'bad';
}) {
  return (
    <div className="status-line" data-tone={tone}>
      <span className="status-line__key">
        <Icon name={icon} size={15} />
        {label}
      </span>
      <span className="status-line__val">{value}</span>
    </div>
  );
}

const TONE_BY_STATUS = { HEALTHY: 'ok', DEGRADED: 'warn', DOWN: 'bad' } as const;

export function SystemStatusPanel({ health }: { health: SystemHealth }) {
  const workerRatio = health.workersExpected
    ? health.workersOnline / health.workersExpected
    : 0;

  return (
    <Panel
      title="Estado del sistema"
      subtitle="API, workers aislados y persistencia. Los entrenamientos nunca se ejecutan en el proceso de la API (RN-03)."
      icon="server"
      actions={
        <span className="chip chip--outline">
          <Icon name="gauge" size={13} />
          {formatNumber(health.apiLatencyMs, 0)} ms
        </span>
      }
    >
      <div className="status-grid">
        <StatusLine
          icon="zap"
          label="API REST"
          value={health.apiStatus === 'HEALTHY' ? 'Operativa' : 'Degradada'}
          tone={TONE_BY_STATUS[health.apiStatus]}
        />
        <StatusLine
          icon="server"
          label="Workers ML"
          value={`${health.workersOnline} de ${health.workersExpected}`}
          tone={workerRatio >= 1 ? 'ok' : workerRatio >= 0.5 ? 'warn' : 'bad'}
        />
        <StatusLine
          icon="queue"
          label="Profundidad de cola"
          value={`${health.queueDepth} ${health.queueDepth === 1 ? 'trabajo' : 'trabajos'}`}
          tone={health.queueDepth > 6 ? 'warn' : 'ok'}
        />
        <StatusLine
          icon="storage"
          label="PostgreSQL"
          value={health.databaseStatus === 'HEALTHY' ? 'Saludable' : 'Atención'}
          tone={TONE_BY_STATUS[health.databaseStatus]}
        />
      </div>

      <div className="meter-grid">
        {health.meters.map((meter) => (
          <Meter
            key={meter.id}
            label={meter.label}
            detail={`${formatNumber(meter.used, meter.used % 1 === 0 ? 0 : 1)} / ${formatNumber(
              meter.limit,
              0,
            )} ${meter.unit}`}
            ratio={meter.used / meter.limit}
            tone={meter.tone}
          />
        ))}
      </div>

      <p className="panel__note">
        Almacén de artefactos al {percentage(health.storageUsedGb, health.storageLimitGb)} %. Las
        versiones publicadas no se sobrescriben (RN-04).
      </p>
    </Panel>
  );
}
