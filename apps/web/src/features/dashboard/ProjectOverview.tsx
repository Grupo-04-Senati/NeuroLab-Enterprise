import { Link } from 'react-router-dom';
import type { ProjectSummary } from '@/types/domain';
import { familyMeta } from '@/lib/nav';
import { formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';

const PROJECT_STATUS: Record<ProjectSummary['status'], { label: string; tone: 'completed' | 'neutral' | 'running' }> = {
  ACTIVE: { label: 'Activo', tone: 'completed' },
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  ARCHIVED: { label: 'Archivado', tone: 'running' },
};

export function ProjectOverview({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Panel
      title="Resumen de proyectos"
      subtitle="Espacio de trabajo con acceso por rol; cada proyecto concentra arquitectura, dataset y ejecuciones."
      icon="projects"
      footer={
        <>
          <span>{projects.length} proyectos con acceso para su rol.</span>
          <a href="/projects">Abrir el listado completo</a>
        </>
      }
    >
      <div className="proj-list">
        {projects.map((project) => (
          <Link to="/projects" className="proj-card" key={project.id}>
            <div className="proj-card__head">
              <span className="proj-card__name u-truncate">{project.name}</span>
              <Chip tone={PROJECT_STATUS[project.status].tone}>
                {PROJECT_STATUS[project.status].label}
              </Chip>
            </div>
            <p className="proj-card__desc">{project.description}</p>
            <div className="proj-card__foot">
              <Chip tone="outline">{familyMeta[project.family].label}</Chip>
              <span>
                {project.members} miembros · {formatRelativeTime(project.lastActivityAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
