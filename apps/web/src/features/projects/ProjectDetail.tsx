import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Actor } from '@/types/domain';
import type {
  DirectoryUser,
  ProjectDocument,
  ProjectMemberRole,
  ProjectRecord,
} from '@/types/project';
import { formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { ProjectStatusChip } from '@/features/projects/ProjectStatusChip';
import { ProjectContextTab } from '@/features/projects/ProjectContextTab';
import { ProjectMembersTab } from '@/features/projects/ProjectMembersTab';
import { ProjectDocsTab } from '@/features/projects/ProjectDocsTab';
import {
  canEditDocumentation,
  canEditProject,
  canManageMembers,
  projectOwner,
} from '@/features/projects/model';

export type ProjectTab = 'context' | 'members' | 'docs';

interface ProjectDetailProps {
  project: ProjectRecord | null;
  users: DirectoryUser[];
  actor: Actor;
  tab: ProjectTab;
  onTab: (tab: ProjectTab) => void;
  onEdit: () => void;
  onInvite: () => void;
  onAddDoc: () => void;
  onEditDoc: (document: ProjectDocument) => void;
  onDeleteDoc: (document: ProjectDocument) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onChangeRole: (userId: string, role: ProjectMemberRole) => void;
  onRemoveMember: (userId: string) => void;
  onToggleArchive: () => void;
  onClose: () => void;
}

const TABS: Array<{ id: ProjectTab; label: string }> = [
  { id: 'context', label: 'Contexto' },
  { id: 'members', label: 'Miembros' },
  { id: 'docs', label: 'Documentación' },
];

export function ProjectDetail({
  project,
  users,
  actor,
  tab,
  onTab,
  onEdit,
  onInvite,
  onAddDoc,
  onEditDoc,
  onDeleteDoc,
  onAddTag,
  onRemoveTag,
  onChangeRole,
  onRemoveMember,
  onToggleArchive,
  onClose,
}: ProjectDetailProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!project) {
    return (
      <Panel title="Ficha del proyecto" icon="projects" subtitle="Selecciona un proyecto de la cartera.">
        <div className="empty">
          <Icon name="projects" />
          <h3>Ningún proyecto seleccionado</h3>
          <p>Elige una fila del catálogo para revisar el contexto, el equipo y la documentación.</p>
        </div>
      </Panel>
    );
  }

  const owner = projectOwner(project, users);
  const canEdit = canEditProject(project, actor);
  const canManage = canManageMembers(project, actor);
  const canEditDocs = canEditDocumentation(project, actor);

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next = index;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    onTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const footer =
    tab === 'context' ? (
      <>
        <span className="pj-foot-actions">
          {canEdit ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={onToggleArchive}>
              <Icon name={project.status === 'ARCHIVED' ? 'refresh' : 'archive'} size={14} />
              {project.status === 'ARCHIVED' ? 'Reactivar proyecto' : 'Archivar proyecto'}
            </button>
          ) : (
            <span className="pj-foot-note">
              <Icon name="lock" size={13} />{' '}
              {canEditDocs ? 'Ficha y miembros reservados al responsable' : 'Solo lectura para tu rol'}
            </span>
          )}
        </span>
        <span className="pj-foot-note">Actualizado {formatRelativeTime(project.updatedAt)}</span>
      </>
    ) : tab === 'members' ? (
      <>
        <span className="pj-foot-note">
          {project.members.length} {project.members.length === 1 ? 'persona con acceso' : 'personas con acceso'} ·
          roles por proyecto
        </span>
        {canManage ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onInvite}>
            <Icon name="userPlus" size={14} />
            Añadir miembro
          </button>
        ) : null}
      </>
    ) : (
      <>
        <span className="pj-foot-note">
          {project.tags.length} {project.tags.length === 1 ? 'etiqueta' : 'etiquetas'} ·{' '}
          {project.documents.length} {project.documents.length === 1 ? 'página' : 'páginas'}
        </span>
        {canEditDocs ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onAddDoc}>
            <Icon name="plus" size={14} />
            Nueva documentación
          </button>
        ) : null}
      </>
    );

  return (
    <div
      className="ds-modal pj-detail-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel pj-detail-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha del proyecto ${project.name}`}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Panel
          className="pj-detail"
          title={project.name}
          subtitle={`${project.id} · Responsable: ${owner?.displayName ?? 'sin asignar'}`}
          icon="projects"
          actions={
            <>
              <ProjectStatusChip status={project.status} />
              {canEdit ? (
                <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
                  <Icon name="edit" size={14} />
                  Editar
                </button>
              ) : null}
              <button
                type="button"
                ref={closeRef}
                className="btn btn--ghost btn--icon"
                onClick={onClose}
                aria-label="Cerrar ficha del proyecto"
              >
                <Icon name="close" size={16} />
              </button>
            </>
          }
          body="tight"
          footer={footer}
        >
          <div className="pj-tablist" role="tablist" aria-label="Secciones del proyecto">
            {TABS.map((item, index) => {
              const selected = tab === item.id;
              const count =
                item.id === 'members'
                  ? project.members.length
                  : item.id === 'docs'
                    ? project.documents.length
                    : null;
              return (
                <button
                  key={item.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`pj-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`pj-panel-${item.id}`}
                  tabIndex={selected ? 0 : -1}
                  className="pj-tab"
                  onClick={() => onTab(item.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {item.label}
                  {count !== null ? <span className="pj-tab__count">{count}</span> : null}
                </button>
              );
            })}
          </div>

          <div
            id={`pj-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`pj-tab-${tab}`}
            tabIndex={0}
            className="pj-tabpanel"
          >
            {tab === 'context' ? (
              <ProjectContextTab
                project={project}
                users={users}
                actor={actor}
                onOpenDocs={() => onTab('docs')}
              />
            ) : tab === 'members' ? (
              <ProjectMembersTab
                project={project}
                users={users}
                actor={actor}
                onChangeRole={onChangeRole}
                onRemoveMember={onRemoveMember}
              />
            ) : (
              <ProjectDocsTab
                project={project}
                users={users}
                actor={actor}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                onAddDoc={onAddDoc}
                onEditDoc={onEditDoc}
                onDeleteDoc={onDeleteDoc}
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
