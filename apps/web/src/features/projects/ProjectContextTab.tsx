import type { Actor } from '@/types/domain';
import type { DirectoryUser, ProjectRecord } from '@/types/project';
import { familyMeta } from '@/lib/nav';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  memberRoleMeta,
  projectMemberUsers,
  projectOwner,
  projectRole,
  resolveUser,
} from '@/features/projects/model';

interface ProjectContextTabProps {
  project: ProjectRecord;
  users: DirectoryUser[];
  actor: Actor;
  onOpenDocs: () => void;
}

export function ProjectContextTab({ project, users, actor, onOpenDocs }: ProjectContextTabProps) {
  const owner = projectOwner(project, users);
  const members = projectMemberUsers(project, users);
  const role = projectRole(project, actor.id);
  const roleMeta = role ? memberRoleMeta[role] : null;
  const latestDoc = [...project.documents].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  const latestAuthor = latestDoc ? resolveUser(users, latestDoc.authorId) : undefined;

  return (
    <div className="pj-context">
      <section className="pj-block" aria-labelledby="pj-problem-title">
        <div className="pj-block__head">
          <h3 id="pj-problem-title">Problema a resolver</h3>
          <span className="u-caps">{familyMeta[project.family].label}</span>
        </div>
        <p className="pj-problem">{project.description}</p>
      </section>

      <ul className="pj-tags" aria-label="Etiquetas del proyecto">
        {project.tags.map((tag) => (
          <li key={tag}>
            <Icon name="tag" size={11} />
            {tag}
          </li>
        ))}
        {project.tags.length === 0 ? <li className="pj-tag--empty">Sin etiquetas</li> : null}
      </ul>

      <dl className="ds-facts pj-facts">
        <div className="ds-fact">
          <dt>Identificador</dt>
          <dd className="u-mono">{project.id}</dd>
        </div>
        <div className="ds-fact">
          <dt>Responsable</dt>
          <dd>{owner?.displayName ?? 'Sin responsable'}</dd>
        </div>
        <div className="ds-fact">
          <dt>Equipo</dt>
          <dd>
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </dd>
        </div>
        <div className="ds-fact">
          <dt>Documentación</dt>
          <dd>
            {project.documents.length} {project.documents.length === 1 ? 'página' : 'páginas'}
          </dd>
        </div>
        <div className="ds-fact">
          <dt>Creado</dt>
          <dd>{formatDate(project.createdAt)}</dd>
        </div>
        <div className="ds-fact">
          <dt>Actualizado</dt>
          <dd title={formatDate(project.updatedAt)}>{formatRelativeTime(project.updatedAt)}</dd>
        </div>
      </dl>

      <section className="pj-access" aria-label="Tu acceso al proyecto">
        <Icon name={roleMeta && role !== 'reader' ? 'shield' : 'lock'} size={16} />
        <span>
          {roleMeta ? (
            <>
              <strong>Tu rol: {roleMeta.label}</strong> · {roleMeta.hint}
            </>
          ) : (
            <>
              <strong>Sin acceso directo</strong> · Pide al responsable que te añada al proyecto.
            </>
          )}
        </span>
      </section>

      <section className="pj-block" aria-labelledby="pj-latest-doc-title">
        <div className="pj-block__head">
          <h3 id="pj-latest-doc-title">Documentación reciente</h3>
          <button type="button" className="pj-link" onClick={onOpenDocs}>
            Ver documentación
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
        {latestDoc ? (
          <button type="button" className="pj-latest-doc" onClick={onOpenDocs}>
            <span className="pj-latest-doc__icon">
              <Icon name="fileText" size={16} />
            </span>
            <span className="pj-latest-doc__text">
              <strong>{latestDoc.title}</strong>
              <span>
                {latestAuthor?.displayName ?? 'Autor desconocido'} ·{' '}
                {formatRelativeTime(latestDoc.updatedAt)}
              </span>
            </span>
            <Chip tone="outline">Leer</Chip>
          </button>
        ) : (
          <p className="pj-muted">
            Este proyecto todavía no tiene documentación. Un responsable o ingeniero puede añadir contexto,
            supuestos y restricciones.
          </p>
        )}
      </section>
    </div>
  );
}
