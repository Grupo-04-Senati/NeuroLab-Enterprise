import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JobStatus, TrainingJob } from '@/types/domain';
import { usePlatformData } from '@/app/providers';
import { dataSource } from '@/lib/api/dashboard';
import { formatRelativeTime } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SummaryCards, SummaryCardsSkeleton } from '@/features/dashboard/SummaryCards';
import { ActiveTrainings } from '@/features/dashboard/ActiveTrainings';
import { RecentJobsTable } from '@/features/dashboard/RecentJobsTable';
import { CurvesPanel } from '@/features/dashboard/CurvesPanel';
import { ActivityPanel } from '@/features/dashboard/ActivityPanel';
import { SystemStatusPanel } from '@/features/dashboard/SystemStatusPanel';
import { AlertFeed } from '@/features/dashboard/AlertFeed';
import { ProjectOverview } from '@/features/dashboard/ProjectOverview';
import { QuickActions } from '@/features/dashboard/QuickActions';

type StatusFilter = 'ALL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'COMPLETED', label: 'Completados' },
  { id: 'FAILED', label: 'Fallidos' },
  { id: 'CANCELLED', label: 'Cancelados' },
];

function matches(job: TrainingJob, term: string): boolean {
  if (!term) return true;
  const haystack = [
    job.project,
    job.id,
    job.architectureName,
    job.datasetName,
    job.owner,
    job.family,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export function DashboardPage() {
  const { snapshot, status, error, lastUpdated, pendingCancellation, refresh, cancelJob } =
    usePlatformData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const term = searchParams.get('q') ?? '';

  const setTerm = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const data = useMemo(() => {
    if (!snapshot) return null;
    const active = snapshot.activeJobs.filter((job) => matches(job, term));
    const queued = snapshot.queuedJobs.filter((job) => matches(job, term));
    const terminal = snapshot.recentJobs.filter(
      (job) => matches(job, term) && (filter === 'ALL' || job.status === filter),
    );
    const projects = snapshot.topProjects.filter((project) =>
      term ? `${project.name} ${project.description}`.toLowerCase().includes(term.toLowerCase()) : true,
    );
    return { active, queued, terminal, projects };
  }, [snapshot, term, filter]);

  const counts = useMemo(() => {
    const base: Record<JobStatus, number> = {
      QUEUED: 0,
      PREPARING: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    snapshot?.recentJobs.forEach((job) => {
      base[job.status] += 1;
    });
    return base;
  }, [snapshot]);

  /* La curva de aprendizaje se ofrece con todos los trabajos, sin el filtro de la barra. */
  const plottable = useMemo(
    () =>
      snapshot
        ? [...snapshot.activeJobs, ...snapshot.queuedJobs, ...snapshot.recentJobs]
        : [],
    [snapshot],
  );

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="dashboard" size={14} strokeWidth={2} />
            M01 · Inicio
          </p>
          <h1 className="page-head__title">Panel de control de experimentación</h1>
          <p className="page-head__lede">
            Estado consolidado de proyectos, entrenamientos y artefactos de modelo. Las métricas se
            sincronizan desde la API; el entrenamiento continúa en el worker aunque cierre esta pantalla.
          </p>
        </div>
        <div className="page-head__actions">
          <a className="btn btn--secondary" href="/reports">
            <Icon name="report" size={16} />
            Exportar informe
          </a>
          <a className="btn btn--primary" href="/projects">
            <Icon name="plus" size={16} />
            Nuevo proyecto
          </a>
        </div>
      </div>

      {error ? (
        <div className="callout" role="alert">
          <Icon name="alertTriangle" size={18} />
          <div>
            <p>
              <strong>No fue posible leer el estado de la plataforma.</strong> {error}
            </p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={refresh}>
              <Icon name="refresh" size={14} />
              Reintentar ahora
            </button>
          </div>
        </div>
      ) : null}

      {status === 'loading' || !snapshot || !data ? (
        <>
          <SummaryCardsSkeleton />
          <div className="dash__main" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="dash__col">
              <div className="panel">
                <div className="panel__body">
                  <div className="skeleton" style={{ height: 120 }} />
                </div>
              </div>
            </div>
            <div className="dash__col">
              <div className="panel">
                <div className="panel__body">
                  <div className="skeleton" style={{ height: 200 }} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="dash">
          <SummaryCards kpis={snapshot.kpis} />

          <section className="toolbar" aria-label="Filtros del panel">
            <div className="filters" role="group" aria-label="Filtrar historial por estado">
              {FILTERS.map((item) => {
                const count =
                  item.id === 'ALL'
                    ? snapshot.recentJobs.length
                    : counts[item.id as JobStatus];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="filter-btn"
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                    <span className="filter-btn__count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="search toolbar__search">
              <Icon name="search" size={16} />
              <label className="u-sr-only" htmlFor="panel-search">
                Filtrar entrenamientos
              </label>
              <input
                id="panel-search"
                type="search"
                placeholder="Filtrar por proyecto, job o dataset"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
            </div>

            <p className="live-tag" aria-live="off">
              <span className="live-tag__dot" aria-hidden="true" />
              {dataSource === 'demo' ? 'Datos de demostración' : 'Sincronizado con la API'} ·{' '}
              {lastUpdated ? formatRelativeTime(lastUpdated) : 'pendiente'}
              <button type="button" className="btn btn--ghost btn--sm" onClick={refresh}>
                <Icon name="refresh" size={14} />
                Actualizar
              </button>
            </p>
          </section>

          {term ? (
            <Chip tone="outline">
              <Icon name="search" size={12} />
              {`${term}: ${data.active.length + data.terminal.length} resultados`}
            </Chip>
          ) : null}

          <div className="dash__main">
            <div className="dash__col">
              <ActiveTrainings
                jobs={data.active}
                queued={data.queued}
                pendingCancellation={pendingCancellation}
                onCancel={cancelJob}
              />

              <CurvesPanel jobs={plottable} />

              <ActivityPanel activity={snapshot.activity} />
            </div>

            <div className="dash__col">
              <SystemStatusPanel health={snapshot.health} />
              <AlertFeed alerts={snapshot.alerts} />
              <ProjectOverview projects={data.projects} />
              <QuickActions />
            </div>
          </div>

          <RecentJobsTable
            jobs={data.terminal}
            total={snapshot.recentJobs.length}
            filtered={filter !== 'ALL' || term.length > 0}
          />
        </div>
      )}
    </>
  );
}
