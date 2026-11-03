import type { NetworkFamily } from '@/types/domain';
import type { DirectoryUser, ProjectRecord } from '@/types/project';
import { familyMeta } from '@/lib/nav';
import { formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { ProjectStatusChip } from '@/features/projects/ProjectStatusChip';
import {
  PROJECT_FAMILIES,
  PROJECT_FILTERS,
  avatarTone,
  projectMemberUsers,
  projectOwner,
  type ProjectFilter,
} from '@/features/projects/model';

interface ProjectCatalogProps {
  projects: ProjectRecord[];
  total: number;
  matchCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (page: number) => void;
  selectedId: string | null;
  filter: ProjectFilter;
  counts: Record<ProjectFilter, number>;
  family: NetworkFamily | 'ALL';
  tag: string | 'ALL';
  tags: string[];
  term: string;
  users: DirectoryUser[];
  onSelect: (id: string) => void;
  onFilter: (filter: ProjectFilter) => void;
  onFamily: (family: NetworkFamily | 'ALL') => void;
  onTag: (tag: string | 'ALL') => void;
  onTerm: (term: string) => void;
}

function MemberStack({ project, users }: { project: ProjectRecord; users: DirectoryUser[] }) {
  const members = projectMemberUsers(project, users);
  const visible = members.slice(0, 3);
  const remaining = members.length - visible.length;
  const label = members.map(({ user }) => user.displayName).join(', ');

  return (
    <span className="pj-members-cell">
      <span className="pj-avatars" title={label} aria-hidden="true">
        {visible.map(({ user }) => (
          <span key={user.id} className="pj-avatar pj-avatar--sm" data-tone={avatarTone(user.id)}>
            {user.initials}
          </span>
        ))}
        {remaining > 0 ? <span className="pj-avatar pj-avatar--sm pj-avatar--more">+{remaining}</span> : null}
      </span>
      <span className="pj-members-cell__count">
        {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
      </span>
    </span>
  );
}

export function ProjectCatalog({
  projects,
  total,
  matchCount,
  page,
  pageCount,
  pageSize,
  onPage,
  selectedId,
  filter,
  counts,
  family,
  tag,
  tags,
  term,
  users,
  onSelect,
  onFilter,
  onFamily,
  onTag,
  onTerm,
}: ProjectCatalogProps) {
  const rangeStart = matchCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, matchCount);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <Panel
      title="Cartera de proyectos"
      subtitle="Selecciona un proyecto para abrir su ficha, equipo y documentación."
      icon="projects"
      body="tight"
      actions={
        <span className="u-caps">
          {matchCount} de {total}
        </span>
      }
      footer={
        <>
          <span>
            {matchCount === 0
              ? 'Ningún proyecto coincide con la búsqueda'
              : `${matchCount} ${matchCount === 1 ? 'proyecto visible' : 'proyectos visibles'} · acceso verificado por pertenencia`}
          </span>
          <a href="/admin">Política de permisos</a>
        </>
      }
    >
      <div className="pj-toolbar">
        <div className="filters" role="group" aria-label="Filtrar proyectos por estado">
          {PROJECT_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="filter-btn"
              aria-pressed={filter === option.id}
              onClick={() => onFilter(option.id)}
            >
              {option.label}
              <span className="filter-btn__count">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="pj-toolbar__controls">
          <label className="pj-filter">
            <span>Familia</span>
            <select
              className="ds-input"
              value={family}
              onChange={(event) => onFamily(event.target.value as NetworkFamily | 'ALL')}
            >
              <option value="ALL">Todas</option>
              {PROJECT_FAMILIES.map((option) => (
                <option key={option} value={option}>
                  {familyMeta[option].label}
                </option>
              ))}
            </select>
          </label>

          <label className="pj-filter">
            <span>Etiqueta</span>
            <select
              className="ds-input"
              value={tag}
              onChange={(event) => onTag(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {tags.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="search ds-search pj-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={term}
              placeholder="Buscar proyecto, etiqueta o persona"
              aria-label="Buscar proyectos"
              onChange={(event) => onTerm(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="table-wrap">
        {matchCount === 0 ? (
          <div className="empty">
            <Icon name="search" />
            <h3>Sin resultados para este filtro</h3>
            <p>Ajusta la búsqueda, la familia de red o la etiqueta para volver a ver proyectos.</p>
          </div>
        ) : (
          <table className="table pj-table">
            <caption className="u-sr-only">
              Proyectos de IA con su responsable, equipo, estado, etiquetas y fecha de actualización
            </caption>
            <thead>
              <tr>
                <th scope="col">Proyecto</th>
                <th scope="col">Responsable</th>
                <th scope="col">Equipo</th>
                <th scope="col">Estado</th>
                <th scope="col">Etiquetas</th>
                <th scope="col" className="is-right">
                  Actualizado
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const selected = project.id === selectedId;
                const owner = projectOwner(project, users);
                return (
                  <tr
                    key={project.id}
                    className={selected ? 'is-selected' : undefined}
                    onClick={() => onSelect(project.id)}
                  >
                    <td data-col="name" data-label="Proyecto">
                      <button
                        type="button"
                        className="pj-row-name"
                        aria-pressed={selected}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(project.id);
                        }}
                      >
                        <strong>{project.name}</strong>
                        <span>
                          {project.id} · {familyMeta[project.family].label} · {project.documents.length}{' '}
                          {project.documents.length === 1 ? 'documento' : 'documentos'}
                        </span>
                      </button>
                    </td>
                    <td data-label="Responsable">
                      <span className="table__name">
                        <strong>{owner?.displayName ?? 'Sin responsable'}</strong>
                        <span className="table__sub">{owner?.title ?? '—'}</span>
                      </span>
                    </td>
                    <td data-label="Equipo">
                      <MemberStack project={project} users={users} />
                    </td>
                    <td data-label="Estado">
                      <ProjectStatusChip status={project.status} />
                    </td>
                    <td data-label="Etiquetas">
                      <span className="pj-tag-cell">
                        {project.tags.slice(0, 2).map((item) => (
                          <span key={item} className="pj-tag">
                            {item}
                          </span>
                        ))}
                        {project.tags.length > 2 ? (
                          <span className="pj-tag pj-tag--more">+{project.tags.length - 2}</span>
                        ) : null}
                        {project.tags.length === 0 ? <span className="pj-muted">Sin etiquetas</span> : null}
                      </span>
                    </td>
                    <td data-col="meta" data-label="Actualizado" className="is-right" data-numeric>
                      {formatRelativeTime(project.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {matchCount >= pageSize ? (
        <nav className="pj-pagination" aria-label="Paginación de proyectos">
          <p className="pj-pagination__info">
            Mostrando <strong>{rangeStart}–{rangeEnd}</strong> de {matchCount}
          </p>
          <div className="pj-pagination__pages">
            <button
              type="button"
              className="pj-page"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <Icon name="chevronLeft" size={15} />
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                className="pj-page"
                aria-label={`Página ${number}`}
                aria-current={number === page ? 'page' : undefined}
                onClick={() => onPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className="pj-page"
              onClick={() => onPage(page + 1)}
              disabled={page >= pageCount}
              aria-label="Página siguiente"
            >
              <Icon name="chevronRight" size={15} />
            </button>
          </div>
        </nav>
      ) : null}
    </Panel>
  );
}
