import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { NetworkFamily } from '@/types/domain';
import type {
  ProjectDocument,
  ProjectMemberRole,
  ProjectRecord,
} from '@/types/project';
import { directoryUsers, seedProjects } from '@/lib/mock/projects';
import { demoActor } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { ProjectCatalog } from '@/features/projects/ProjectCatalog';
import { ProjectDetail, type ProjectTab } from '@/features/projects/ProjectDetail';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';
import { MemberInviteDialog } from '@/features/projects/MemberInviteDialog';
import { DocEditorDialog } from '@/features/projects/DocEditorDialog';
import { ConfirmDialog } from '@/features/projects/ConfirmDialog';
import {
  canCreateProject,
  collectTags,
  matchesProject,
  memberRoleMeta,
  nextDocumentId,
  nextProjectId,
  userName,
  type ProjectFilter,
  type ProjectFormPayload,
} from '@/features/projects/model';

const STORAGE_KEY = 'neurolab.projects.v1';
const PAGE_SIZE = 10;

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; projectId: string }
  | { kind: 'invite'; projectId: string }
  | { kind: 'doc'; projectId: string; docId?: string }
  | null;

type ConfirmAction =
  | { type: 'removeMember'; userId: string }
  | { type: 'deleteDoc'; docId: string };

interface PendingConfirm {
  projectId: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: ConfirmAction;
}

interface Notice {
  tone: 'success' | 'info';
  text: string;
}

function readProjects(): ProjectRecord[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.description === 'string' &&
        typeof candidate.family === 'string' &&
        typeof candidate.status === 'string' &&
        typeof candidate.ownerId === 'string' &&
        Array.isArray(candidate.members) &&
        Array.isArray(candidate.tags) &&
        Array.isArray(candidate.documents) &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.updatedAt === 'string'
      );
    });
    return valid ? (parsed as ProjectRecord[]) : null;
  } catch {
    return null;
  }
}

function sortByActivity(projects: ProjectRecord[]): ProjectRecord[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectRecord[]>(
    () => readProjects() ?? sortByActivity(seedProjects),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>('ALL');
  const [family, setFamily] = useState<NetworkFamily | 'ALL'>('ALL');
  const [tag, setTag] = useState<string | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<ProjectTab>('context');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);

  const term = searchParams.get('q') ?? '';
  const setTerm = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      /* El almacenamiento del navegador es solo una caché de la demo. */
    }
  }, [projects]);

  const counts = useMemo<Record<ProjectFilter, number>>(
    () => ({
      ALL: projects.length,
      ACTIVE: projects.filter((project) => project.status === 'ACTIVE').length,
      DRAFT: projects.filter((project) => project.status === 'DRAFT').length,
      ARCHIVED: projects.filter((project) => project.status === 'ARCHIVED').length,
    }),
    [projects],
  );

  const tags = useMemo(() => collectTags(projects), [projects]);

  const filtered = useMemo(
    () =>
      sortByActivity(
        projects.filter(
          (project) =>
            (filter === 'ALL' || project.status === filter) &&
            (family === 'ALL' || project.family === family) &&
            (tag === 'ALL' ||
              project.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) &&
            matchesProject(project, term, directoryUsers),
        ),
      ),
    [projects, filter, family, tag, term],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  /** Cualquier cambio de criterio vuelve a la primera página. */
  useEffect(() => {
    setPage(1);
  }, [filter, family, tag, term]);

  useEffect(() => {
    setTab('context');
  }, [selectedId]);

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const summary = useMemo(() => {
    const memberIds = new Set(projects.flatMap((project) => project.members.map((member) => member.userId)));
    const assignments = projects.reduce((acc, project) => acc + project.members.length, 0);
    const docs = projects.reduce((acc, project) => acc + project.documents.length, 0);
    const withDocs = projects.filter((project) => project.documents.length > 0).length;
    const activeWithoutDocs = projects.filter(
      (project) => project.status === 'ACTIVE' && project.documents.length === 0,
    ).length;
    return {
      active: counts.ACTIVE,
      drafts: counts.DRAFT,
      archived: counts.ARCHIVED,
      people: memberIds.size,
      assignments,
      docs,
      withDocs,
      tags: tags.length,
      attention: counts.DRAFT + activeWithoutDocs,
      activeWithoutDocs,
    };
  }, [projects, counts, tags]);

  const handleSelect = (id: string) => {
    detailTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(id);
    setTab('context');
  };

  const handleCloseDetail = () => {
    const trigger = detailTrigger.current;
    setSelectedId(null);
    trigger?.focus();
  };

  const handleCreate = (payload: ProjectFormPayload) => {
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      id: nextProjectId(projects),
      name: payload.name,
      description: payload.description,
      family: payload.family,
      status: payload.status,
      ownerId: demoActor.id,
      members: [{ userId: demoActor.id, role: 'owner', addedAt: now }],
      tags: payload.tags,
      documents: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((previous) => [record, ...previous]);
    setSelectedId(null);
    setPage(1);
    setFilter('ALL');
    setFamily('ALL');
    setTag('ALL');
    setTerm('');
    setDialog(null);
    setNotice({
      tone: 'success',
      text: `${record.id} · ${record.name} creado. Quedaste como responsable y puedes invitar al equipo desde la pestaña Miembros.`,
    });
  };

  const handleUpdate = (project: ProjectRecord, payload: ProjectFormPayload) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id ? { ...item, ...payload, updatedAt: now } : item,
      ),
    );
    setDialog(null);
    setNotice({
      tone: 'success',
      text: `${project.name} actualizado: contexto, familia, estado y etiquetas quedaron guardados.`,
    });
  };

  const handleInvite = (project: ProjectRecord, userId: string, role: ProjectMemberRole) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              members: [...item.members, { userId, role, addedAt: now }],
              updatedAt: now,
            }
          : item,
      ),
    );
    setDialog(null);
    setNotice({
      tone: 'success',
      text: `${userName(directoryUsers, userId)} se añadió al proyecto con rol ${memberRoleMeta[role].label}.`,
    });
  };

  const handleChangeRole = (project: ProjectRecord, userId: string, role: ProjectMemberRole) => {
    const target = project.members.find((member) => member.userId === userId);
    if (!target || target.role === 'owner') return;
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              members: item.members.map((member) =>
                member.userId === userId ? { ...member, role } : member,
              ),
              updatedAt: now,
            }
          : item,
      ),
    );
    setNotice({
      tone: 'info',
      text: `El rol de ${userName(directoryUsers, userId)} se actualizó en ${project.name}.`,
    });
  };

  const handleRemoveMember = (project: ProjectRecord, userId: string) => {
    const target = project.members.find((member) => member.userId === userId);
    if (!target || target.role === 'owner') return;
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              members: item.members.filter((member) => member.userId !== userId),
              updatedAt: now,
            }
          : item,
      ),
    );
    setConfirm(null);
    setNotice({
      tone: 'info',
      text: `${userName(directoryUsers, userId)} ya no tiene acceso a ${project.name}.`,
    });
  };

  const handleAddDocument = (project: ProjectRecord, title: string, body: string) => {
    const now = new Date().toISOString();
    const document: ProjectDocument = {
      id: nextDocumentId(project),
      title,
      body,
      authorId: demoActor.id,
      updatedAt: now,
    };
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? { ...item, documents: [document, ...item.documents], updatedAt: now }
          : item,
      ),
    );
    setDialog(null);
    setTab('docs');
    setNotice({ tone: 'success', text: `Documentación «${title}» guardada en ${project.name}.` });
  };

  const handleUpdateDocument = (
    project: ProjectRecord,
    documentId: string,
    title: string,
    body: string,
  ) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              documents: item.documents.map((document) =>
                document.id === documentId ? { ...document, title, body, updatedAt: now } : document,
              ),
              updatedAt: now,
            }
          : item,
      ),
    );
    setDialog(null);
    setNotice({ tone: 'success', text: `Documentación «${title}» actualizada.` });
  };

  const handleDeleteDocument = (project: ProjectRecord, document: ProjectDocument) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              documents: item.documents.filter((entry) => entry.id !== document.id),
              updatedAt: now,
            }
          : item,
      ),
    );
    setConfirm(null);
    setNotice({ tone: 'info', text: `Se eliminó la documentación «${document.title}».` });
  };

  const handleAddTag = (project: ProjectRecord, value: string) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? { ...item, tags: [...item.tags, value], updatedAt: now }
          : item,
      ),
    );
  };

  const handleRemoveTag = (project: ProjectRecord, value: string) => {
    const now = new Date().toISOString();
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id
          ? {
              ...item,
              tags: item.tags.filter((entry) => entry.toLowerCase() !== value.toLowerCase()),
              updatedAt: now,
            }
          : item,
      ),
    );
  };

  const handleToggleArchive = (project: ProjectRecord) => {
    const now = new Date().toISOString();
    const nextStatus = project.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    setProjects((previous) =>
      previous.map((item) =>
        item.id === project.id ? { ...item, status: nextStatus, updatedAt: now } : item,
      ),
    );
    setNotice({
      tone: nextStatus === 'ARCHIVED' ? 'info' : 'success',
      text:
        nextStatus === 'ARCHIVED'
          ? `${project.name} quedó archivado. Se conserva la trazabilidad y no admite nuevos entrenamientos.`
          : `${project.name} se reactivó como proyecto activo.`,
    });
  };

  const handleReset = () => {
    const seeded = sortByActivity(seedProjects);
    setProjects(seeded);
    setSelectedId(null);
    setPage(1);
    setFilter('ALL');
    setFamily('ALL');
    setTag('ALL');
    setTerm('');
    setDialog(null);
    setConfirm(null);
    setNotice({ tone: 'info', text: 'Cartera demo restaurada con los diez proyectos de ejemplo.' });
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const project = projects.find((item) => item.id === confirm.projectId);
    if (!project) {
      setConfirm(null);
      return;
    }
    const action = confirm.action;
    if (action.type === 'removeMember') {
      handleRemoveMember(project, action.userId);
      return;
    }
    const document = project.documents.find((item) => item.id === action.docId);
    if (document) handleDeleteDocument(project, document);
    else setConfirm(null);
  };

  const dialogProject =
    dialog && 'projectId' in dialog
      ? projects.find((project) => project.id === dialog.projectId) ?? null
      : null;
  const editingDoc =
    dialog?.kind === 'doc' && dialog.docId
      ? dialogProject?.documents.find((document) => document.id === dialog.docId) ?? null
      : null;
  const canCreate = canCreateProject(demoActor);

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="projects" size={14} strokeWidth={2} />
            M02 · Proyectos de IA
          </p>
          <h1 className="page-head__title">Proyectos y espacios de trabajo</h1>
          <p className="page-head__lede">
            Crea proyectos, describe el problema que quieres resolver, organiza al equipo y guarda la
            documentación que da contexto a cada experimento. Cada consulta y acción valida la pertenencia
            al proyecto.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={handleReset}>
            <Icon name="refresh" size={16} />
            Restaurar demo
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canCreate}
            title={canCreate ? undefined : 'Tu rol global no permite crear proyectos'}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" size={16} />
            Nuevo proyecto
          </button>
        </div>
      </div>

      {notice ? (
        <div className="ds-notice" data-tone={notice.tone} role="status">
          <Icon name={notice.tone === 'success' ? 'checkCircle' : 'info'} size={16} />
          <p>{notice.text}</p>
          <button
            type="button"
            className="ds-notice__close"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      <div className="dash">
        <section className="kpi-grid" aria-label="Indicadores de la cartera de proyectos">
          <article className="kpi" data-accent="indigo">
            <div className="kpi__top">
              <h3 className="kpi__label">Proyectos accesibles</h3>
              <span className="kpi__icon">
                <Icon name="projects" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{projects.length}</p>
            </div>
            <div className="kpi__foot">
              <span>{summary.active} activos</span>
              <span>{summary.drafts} en borrador</span>
            </div>
          </article>

          <article className="kpi" data-accent="emerald">
            <div className="kpi__top">
              <h3 className="kpi__label">Personas con acceso</h3>
              <span className="kpi__icon">
                <Icon name="users" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{summary.people}</p>
            </div>
            <div className="kpi__foot">
              <span>{summary.assignments} asignaciones</span>
              <span>Roles por proyecto</span>
            </div>
          </article>

          <article className="kpi" data-accent="violet">
            <div className="kpi__top">
              <h3 className="kpi__label">Documentación</h3>
              <span className="kpi__icon">
                <Icon name="fileText" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{summary.docs}</p>
            </div>
            <div className="kpi__foot">
              <span>{summary.tags} etiquetas</span>
              <span>{summary.withDocs} proyectos documentados</span>
            </div>
          </article>

          <article className="kpi" data-accent="amber">
            <div className="kpi__top">
              <h3 className="kpi__label">Requieren atención</h3>
              <span className="kpi__icon">
                <Icon name="alertTriangle" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{summary.attention}</p>
            </div>
            <div className="kpi__foot">
              <span>{summary.drafts} borradores</span>
              <span>{summary.activeWithoutDocs} activos sin documentación</span>
            </div>
          </article>
        </section>

        <ProjectCatalog
          projects={paged}
          total={projects.length}
          matchCount={filtered.length}
          page={currentPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          selectedId={selectedId}
          filter={filter}
          counts={counts}
          family={family}
          tag={tag}
          tags={tags}
          term={term}
          users={directoryUsers}
          onSelect={handleSelect}
          onFilter={(value) => {
            setFilter(value);
            setTab('context');
          }}
          onFamily={setFamily}
          onTag={setTag}
          onTerm={setTerm}
        />

        <Panel title="Gobierno del proyecto" icon="shield" subtitle="Controles aplicados en cada consulta y acción.">
          <ul className="ds-policy">
            <li>
              <Icon name="checkCircle" size={14} />
              La pertenencia al proyecto se comprueba en el backend; la interfaz no es la frontera de
              seguridad.
            </li>
            <li>
              <Icon name="checkCircle" size={14} />
              Cada proyecto conserva un responsable y el propietario no puede quitarse a sí mismo.
            </li>
            <li>
              <Icon name="checkCircle" size={14} />
              Solo responsables e ingenieros mantienen la documentación y las etiquetas.
            </li>
            <li>
              <Icon name="checkCircle" size={14} />
              Los proyectos archivados se conservan para trazabilidad y no admiten nuevos entrenamientos.
            </li>
            <li>
              <Icon name="checkCircle" size={14} />
              Los cambios de rol, acceso y documentación se registran en auditoría (M10).
            </li>
          </ul>
          <p className="panel__note">
            Esta demo persiste los cambios en el navegador. En producción, los endpoints{' '}
            <span className="u-mono">GET/POST /api/v1/projects</span> validan permisos y contratos en la API
            (§9 y §11).
          </p>
        </Panel>
      </div>

      {selected && !dialog && !confirm ? (
        <ProjectDetail
          project={selected}
          users={directoryUsers}
          actor={demoActor}
          tab={tab}
          onTab={setTab}
          onClose={handleCloseDetail}
          onEdit={() => setDialog({ kind: 'edit', projectId: selected.id })}
          onInvite={() => setDialog({ kind: 'invite', projectId: selected.id })}
          onAddDoc={() => setDialog({ kind: 'doc', projectId: selected.id })}
          onEditDoc={(document) =>
            setDialog({ kind: 'doc', projectId: selected.id, docId: document.id })
          }
          onDeleteDoc={(document) =>
            setConfirm({
              projectId: selected.id,
              title: 'Eliminar documentación',
              description: `Se eliminará «${document.title}» de ${selected.name}. Esta acción no se puede deshacer desde la interfaz.`,
              confirmLabel: 'Eliminar documentación',
              action: { type: 'deleteDoc', docId: document.id },
            })
          }
          onAddTag={(value) => handleAddTag(selected, value)}
          onRemoveTag={(value) => handleRemoveTag(selected, value)}
          onChangeRole={(userId, role) => handleChangeRole(selected, userId, role)}
          onRemoveMember={(userId) =>
            setConfirm({
              projectId: selected.id,
              title: 'Quitar miembro',
              description: `Se quitará a ${userName(directoryUsers, userId)} de ${selected.name}. Perderá acceso a la ficha, la documentación y los entrenamientos del proyecto. Podrás volver a añadirlo cuando lo necesites.`,
              confirmLabel: 'Quitar miembro',
              action: { type: 'removeMember', userId },
            })
          }
          onToggleArchive={() => handleToggleArchive(selected)}
        />
      ) : null}

      {dialog?.kind === 'create' ? (
        <ProjectFormDialog mode="create" onClose={() => setDialog(null)} onSubmit={handleCreate} />
      ) : null}

      {dialog?.kind === 'edit' && dialogProject ? (
        <ProjectFormDialog
          mode="edit"
          project={dialogProject}
          onClose={() => setDialog(null)}
          onSubmit={(payload) => handleUpdate(dialogProject, payload)}
        />
      ) : null}

      {dialog?.kind === 'invite' && dialogProject ? (
        <MemberInviteDialog
          project={dialogProject}
          users={directoryUsers}
          onClose={() => setDialog(null)}
          onSubmit={(userId, role) => handleInvite(dialogProject, userId, role)}
        />
      ) : null}

      {dialog?.kind === 'doc' && dialogProject ? (
        <DocEditorDialog
          mode={editingDoc ? 'edit' : 'create'}
          document={editingDoc ?? undefined}
          onClose={() => setDialog(null)}
          onSubmit={(title, body) =>
            editingDoc
              ? handleUpdateDocument(dialogProject, editingDoc.id, title, body)
              : handleAddDocument(dialogProject, title, body)
          }
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}
