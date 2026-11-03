import type { ChipProps } from '@/components/ui/Chip';
import type { Actor, NetworkFamily } from '@/types/domain';
import { seedProjects } from '@/lib/mock/projects';
import type {
  DirectoryUser,
  ProjectMemberRole,
  ProjectRecord,
  ProjectStatus,
} from '@/types/project';

type ChipTone = NonNullable<ChipProps['tone']>;

const STORAGE_KEY = 'neurolab.projects.v1';

function isProjectRecord(value: unknown): value is ProjectRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
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
}

export function sortByActivity(projects: ProjectRecord[]): ProjectRecord[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveProjects(projects: ProjectRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    /* El almacenamiento del navegador es solo una caché de la demo. */
  }
}

/**
 * Lee el catálogo persistido por M02; sin él, devuelve la semilla de demostración.
 * Otros módulos (M09) lo consumen aquí en lugar de conocer la clave de almacenamiento.
 */
export function loadProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sortByActivity(seedProjects);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return sortByActivity(seedProjects);
    return parsed.every(isProjectRecord) ? sortByActivity(parsed as ProjectRecord[]) : sortByActivity(seedProjects);
  } catch {
    return sortByActivity(seedProjects);
  }
}

export type ProjectFilter = 'ALL' | ProjectStatus;

export const PROJECT_FILTERS: Array<{ id: ProjectFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ACTIVE', label: 'Activos' },
  { id: 'DRAFT', label: 'Borradores' },
  { id: 'ARCHIVED', label: 'Archivados' },
];

export const projectStatusMeta: Record<
  ProjectStatus,
  { label: string; tone: ChipTone; hint: string }
> = {
  ACTIVE: {
    label: 'Activo',
    tone: 'completed',
    hint: 'Equipo habilitado para configurar y entrenar modelos.',
  },
  DRAFT: {
    label: 'Borrador',
    tone: 'neutral',
    hint: 'Proyecto en definición; todavía no está habilitado para producción.',
  },
  ARCHIVED: {
    label: 'Archivado',
    tone: 'cancelled',
    hint: 'Conservado para trazabilidad; no admite nuevos entrenamientos.',
  },
};

export const PROJECT_FAMILIES: NetworkFamily[] = ['FEEDFORWARD', 'RNN', 'CNN', 'GAN'];

export const memberRoleMeta: Record<
  ProjectMemberRole,
  { label: string; short: string; tone: ChipTone; hint: string }
> = {
  owner: {
    label: 'Responsable de proyecto',
    short: 'Responsable',
    tone: 'running',
    hint: 'Administra configuración, miembros, documentación y estado del proyecto.',
  },
  engineer: {
    label: 'Ingeniero de IA',
    short: 'Ingeniero',
    tone: 'outline',
    hint: 'Configura arquitecturas, entrena modelos y mantiene la documentación.',
  },
  reviewer: {
    label: 'Revisor',
    short: 'Revisor',
    tone: 'preparing',
    hint: 'Consulta resultados y documentación, y aprueba versiones de modelos.',
  },
  reader: {
    label: 'Lector',
    short: 'Lector',
    tone: 'neutral',
    hint: 'Acceso de solo lectura a la ficha, miembros y documentación.',
  },
};

export interface AccessRule {
  capability: string;
  roles: ProjectMemberRole[];
}

/** Matriz de referencia mostrada en la pestaña de miembros (§4.2 y §11). */
export const ACCESS_MATRIX: AccessRule[] = [
  { capability: 'Consultar ficha y documentación', roles: ['owner', 'engineer', 'reviewer', 'reader'] },
  { capability: 'Editar el proyecto y sus etiquetas', roles: ['owner'] },
  { capability: 'Administrar miembros y permisos', roles: ['owner'] },
  { capability: 'Gestionar documentación', roles: ['owner', 'engineer'] },
  { capability: 'Configurar arquitecturas y entrenamientos', roles: ['owner', 'engineer'] },
  { capability: 'Aprobar versiones de modelos', roles: ['owner', 'reviewer'] },
];

/** El administrador global (M10) prevalece sobre el rol del proyecto. */
export function isPlatformAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

export function projectRole(project: ProjectRecord, userId: string): ProjectMemberRole | null {
  return project.members.find((member) => member.userId === userId)?.role ?? null;
}

export function canCreateProject(actor: Actor): boolean {
  return actor.role === 'admin' || actor.role === 'owner' || actor.role === 'engineer';
}

export function canEditProject(project: ProjectRecord, actor: Actor): boolean {
  return isPlatformAdmin(actor) || projectRole(project, actor.id) === 'owner';
}

export function canManageMembers(project: ProjectRecord, actor: Actor): boolean {
  return canEditProject(project, actor);
}

export function canEditDocumentation(project: ProjectRecord, actor: Actor): boolean {
  const role = projectRole(project, actor.id);
  return isPlatformAdmin(actor) || role === 'owner' || role === 'engineer';
}

export function resolveUser(users: DirectoryUser[], userId: string): DirectoryUser | undefined {
  return users.find((user) => user.id === userId);
}

export function userName(users: DirectoryUser[], userId: string): string {
  return resolveUser(users, userId)?.displayName ?? 'Usuario desconocido';
}

export function projectOwner(project: ProjectRecord, users: DirectoryUser[]): DirectoryUser | undefined {
  return resolveUser(users, project.ownerId);
}

export function projectMemberUsers(
  project: ProjectRecord,
  users: DirectoryUser[],
): Array<{ member: ProjectRecord['members'][number]; user: DirectoryUser }> {
  return project.members.flatMap((member) => {
    const user = resolveUser(users, member.userId);
    return user ? [{ member, user }] : [];
  });
}

/** La búsqueda en español debe encontrar «sismica» al escribir «sísmica» o al revés. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchesProject(
  project: ProjectRecord,
  term: string,
  users: DirectoryUser[],
): boolean {
  if (!term.trim()) return true;
  const needle = fold(term.trim());
  const memberText = project.members
    .flatMap((member) => {
      const user = resolveUser(users, member.userId);
      return user ? [user.displayName, user.email, user.title] : [];
    })
    .join(' ');
  const docText = project.documents.map((document) => `${document.title} ${document.body}`).join(' ');
  return fold(
    [
      project.id,
      project.name,
      project.description,
      project.family,
      project.status,
      project.tags.join(' '),
      docText,
      memberText,
    ].join(' '),
  ).includes(needle);
}

export function nextProjectId(projects: ProjectRecord[]): string {
  const highest = projects.reduce((acc, project) => {
    const numeric = Number.parseInt(project.id.replace(/\D+/g, ''), 10);
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc;
  }, 100);
  return `PRJ-${highest + 1}`;
}

export function nextDocumentId(project: ProjectRecord): string {
  const base = project.id.replace(/\D+/g, '');
  const highest = project.documents.reduce((acc, document) => {
    const match = /-(\d+)$/.exec(document.id);
    const numeric = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc;
  }, 0);
  return `DOC-${base}-${String(highest + 1).padStart(2, '0')}`;
}

export function collectTags(projects: ProjectRecord[]): string[] {
  const seen = new Map<string, string>();
  projects.forEach((project) => {
    project.tags.forEach((tag) => {
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    });
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
}

export function hasTag(project: ProjectRecord, tag: string): boolean {
  const needle = tag.toLowerCase();
  return project.tags.some((item) => item.toLowerCase() === needle);
}

export function avatarTone(userId: string): number {
  return [...userId].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
}

export interface ProjectFormPayload {
  name: string;
  description: string;
  family: NetworkFamily;
  status: ProjectStatus;
  tags: string[];
}

export interface ProjectFormErrors {
  name?: string;
  description?: string;
  tags?: string;
}

export function validateProjectForm(payload: ProjectFormPayload): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const name = payload.name.trim();
  const description = payload.description.trim();

  if (name.length < 3) errors.name = 'El nombre debe tener al menos 3 caracteres.';
  else if (name.length > 80) errors.name = 'El nombre no puede superar 80 caracteres.';

  if (description.length < 20) {
    errors.description = 'Describe el problema con al menos 20 caracteres.';
  } else if (description.length > 600) {
    errors.description = 'La descripción no puede superar 600 caracteres.';
  }

  if (payload.tags.length > 8) {
    errors.tags = 'Un proyecto admite como máximo 8 etiquetas.';
  } else if (payload.tags.some((tag) => tag.length < 2 || tag.length > 24)) {
    errors.tags = 'Cada etiqueta debe tener entre 2 y 24 caracteres.';
  }

  return errors;
}

export function hasFormErrors(errors: ProjectFormErrors): boolean {
  return Boolean(errors.name || errors.description || errors.tags);
}
