import type { ActivityPoint } from '@/types/domain';
import { formatNumber } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { ActivityChart } from '@/components/ui/DataViz';

export function ActivityPanel({ activity }: { activity: ActivityPoint[] }) {
  const totalJobs = activity.reduce((sum, point) => sum + point.jobs, 0);
  const totalEpochs = activity.reduce((sum, point) => sum + point.epochs, 0);

  return (
    <Panel
      title="Actividad de la última quincena"
      subtitle="Trabajos completados por día frente al consumo de épocas en los workers."
      icon="metrics"
      actions={
        <div className="inline-stats">
          <span>
            <strong>{formatNumber(totalJobs)}</strong> trabajos
          </span>
          <span>
            <strong>{formatNumber(totalEpochs)}</strong> épocas
          </span>
        </div>
      }
    >
      <ActivityChart data={activity} />
    </Panel>
  );
}
