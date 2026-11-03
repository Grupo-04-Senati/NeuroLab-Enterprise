/* Contratos del M02 · Proyectos de IA. Alineados con las entidades `projects`
   y `project_members` del §8 del Documento Maestro. */

import type { NetworkFamily, UserRole } from '@/types/domain';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

/** Rol del usuario dentro de un proyecto; es independiente del rol global. */
export type ProjectMemberRole = 'owner' | 'engineer' | 'reviewer' | 'reader';

export interface DirectoryUser {
  id: string;
  displayName: string;
  email: string;
  initials: string;
  title: string;
  /** Rol global de la plataforma, gestionado en M10. */
  role: UserRole;
}

export interface ProjectMember {
  userId: string;
  role: ProjectMemberRole;
  addedAt: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  body: string;
  authorId: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  /** Descripción del problema que el proyecto busca resolver (§4.3). */
  description: string;
  family: NetworkFamily;
  status: ProjectStatus;
  ownerId: string;
  members: ProjectMember[];
  tags: string[];
  documents: ProjectDocument[];
  createdAt: string;
  updatedAt: string;
}
