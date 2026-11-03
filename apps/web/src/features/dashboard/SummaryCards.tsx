import type { DashboardKpi } from '@/types/domain';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Sparkline, Trend } from '@/components/ui/DataViz';

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const value = formatNumber(kpi.value, kpi.decimals ?? 0);

  return (
    <article className="kpi" data-accent={kpi.accent}>
      <div className="kpi__top">
        <h3 className="kpi__label">{kpi.label}</h3>
        <span className="kpi__icon">
          <Icon name={kpi.icon} size={17} />
        </span>
      </div>

      <div className="kpi__value-row">
        <p className="kpi__value">
          {value}
          {kpi.unit ? <small>{kpi.unit}</small> : null}
        </p>
        <Trend direction={kpi.trend.direction}>{kpi.trend.value}</Trend>
      </div>

      <div className="kpi__foot">
        <span className="u-truncate">{kpi.footnote}</span>
        <Sparkline values={kpi.spark} />
      </div>
    </article>
  );
}

export function SummaryCards({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="kpi-grid" aria-label="Indicadores resumen de la plataforma">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </section>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <section className="kpi-grid" aria-label="Cargando indicadores" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="kpi" key={index}>
          <div className="skeleton" style={{ height: 14, width: '58%' }} />
          <div className="skeleton" style={{ height: 34, width: '42%' }} />
          <div className="skeleton" style={{ height: 12, width: '80%' }} />
        </div>
      ))}
    </section>
  );
}
