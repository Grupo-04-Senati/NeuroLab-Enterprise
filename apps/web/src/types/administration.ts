/* Contratos del M10 · Administración y seguridad. Alineados con las entidades
   `users` y `audit_events` del §8 y con las reglas del §11 del Documento Maestro. */

import type { UserRole } from '@/types/domain';
import type { DirectoryUser } from '@/types/project';

export type AccountStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LOCKED';

export interface AdminUser extends DirectoryUser {
  status: AccountStatus;
  mfaEnabled: boolean;
  /** Proyectos con acceso vigente según `project_members`. */
  projects: number;
  lastAccessAt: string | null;
  createdAt: string;
  /** Motivo visible del estado cuando no es ACTIVE. */
  statusReason?: string;
}

export type PermissionGroup = 'Gobierno' | 'Proyectos' | 'Modelado' | 'Entrenamiento' | 'Resultados';

export interface PermissionDef {
  id: string;
  label: string;
  group: PermissionGroup;
  hint: string;
  /** Acción trazada en la auditoría por su impacto sobre el acceso. */
  sensitive?: boolean;
}

export interface RoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  permissions: string[];
}

export type AuditCategory =
  | 'ACCESO'
  | 'PERMISOS'
  | 'RECURSOS'
  | 'CONFIGURACION'
  | 'DATASETS'
  | 'ENTRENAMIENTOS'
  | 'MODELOS'
  | 'EXPORTACIONES';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEvent {
  id: string;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  label: string;
  category: AuditCategory;
  target: string;
  projectId: string | null;
  projectName: string | null;
  severity: AuditSeverity;
  ip: string;
  metadata: Record<string, string | number | boolean>;
}

export type AuditDraft = Pick<
  AuditEvent,
  'action' | 'label' | 'category' | 'target' | 'severity' | 'metadata'
> & {
  projectId?: string | null;
  projectName?: string | null;
};

export type ResourceLimitId = 'gpu' | 'concurrency' | 'cpu' | 'memory' | 'duration' | 'storage';

export interface ResourceLimit {
  id: ResourceLimitId;
  label: string;
  unit: string;
  used: number;
  limit: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  hint: string;
}

export type MfaPolicy = 'ADMINS' | 'ALL' | 'OPTIONAL';

export interface SecuritySettings {
  sessionMinutes: number;
  mfaPolicy: MfaPolicy;
  auditRetentionDays: number;
  artifactRetentionDays: number;
  metricsRetentionDays: number;
  exportRequiresReview: boolean;
}

export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface ServiceHealth {
  id: string;
  label: string;
  status: ServiceStatus;
  detail: string;
  latencyMs: number | null;
}

export interface InviteDraft {
  displayName: string;
  email: string;
  role: UserRole;
}

export interface AdministrationSnapshot {
  users: AdminUser[];
  audit: AuditEvent[];
  limits: ResourceLimit[];
  settings: SecuritySettings;
}
