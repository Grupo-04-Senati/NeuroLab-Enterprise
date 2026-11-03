import type { IconName } from '@/components/ui/Icon';
import type { UserRole } from '@/types/domain';
import { roleLabels } from '@/lib/nav';
import { toneForUsage } from '@/lib/format';
import type {
  AccountStatus,
  AdminUser,
  AuditCategory,
  AuditDraft,
  AuditEvent,
  AuditSeverity,
  MfaPolicy,
  PermissionDef,
  PermissionGroup,
  ResourceLimit,
  RoleDefinition,
  SecuritySettings,
  ServiceStatus,
} from '@/types/administration';
import type { Actor } from '@/types/domain';

const allPermissions: PermissionDef[] = [
  {
    id: 'users.manage',
    label: 'Gestionar usuarios',
    group: 'Gobierno',
    hint: 'Invitar, suspender y reactivar cuentas de la plataforma.',
    sensitive: true,
  },
  {
    id: 'roles.manage',
    label: 'Editar roles globales',
    group: 'Gobierno',
    hint: 'Cambiar el rol de una cuenta; toda modificación se audita.',
    sensitive: true,
  },
  {
    id: 'audit.read',
    label: 'Consultar auditoría',
    group: 'Gobierno',
    hint: 'Revisar accesos, permisos y exportaciones registradas.',
  },
  {
    id: 'settings.manage',
    label: 'Políticas y retención',
    group: 'Gobierno',
    hint: 'Ajustar sesión, MFA, cuotas y plazos de conservación.',
    sensitive: true,
  },
  {
    id: 'projects.create',
    label: 'Crear proyectos',
    group: 'Proyectos',
    hint: 'Abrir proyectos nuevos y asignar responsables.',
  },
  {
    id: 'projects.members',
    label: 'Gestionar miembros',
    group: 'Proyectos',
    hint: 'Agregar o retirar integrantes de un proyecto propio.',
  },
  {
    id: 'datasets.publish',
    label: 'Publicar datasets',
    group: 'Modelado',
    hint: 'Registrar versiones validadas y su partición de prueba.',
  },
  {
    id: 'architectures.edit',
    label: 'Diseñar arquitecturas',
    group: 'Modelado',
    hint: 'Editar capas y parámetros con validación del backend.',
  },
  {
    id: 'jobs.launch',
    label: 'Lanzar entrenamientos',
    group: 'Entrenamiento',
    hint: 'Enviar trabajos a la cola con límites vigentes.',
  },
  {
    id: 'jobs.cancel',
    label: 'Cancelar entrenamientos',
    group: 'Entrenamiento',
    hint: 'Solicitar cancelación cooperativa de un trabajo.',
  },
  {
    id: 'jobs.prioritize',
    label: 'Priorizar la cola',
    group: 'Entrenamiento',
    hint: 'Ajustar prioridad y adelantar trabajos propios.',
  },
  {
    id: 'models.approve',
    label: 'Aprobar versiones',
    group: 'Resultados',
    hint: 'Promover una versión de modelo a revisada o aprobada.',
    sensitive: true,
  },
  {
    id: 'reports.export',
    label: 'Exportar reportes y auditoría',
    group: 'Resultados',
    hint: 'Descargar reportes, métricas y extractos de auditoría.',
    sensitive: true,
  },
];

export const permissionGroups: PermissionGroup[] = [
  'Gobierno',
  'Proyectos',
  'Modelado',
  'Entrenamiento',
  'Resultados',
];

export const permissions = allPermissions;

export const permissionsByGroup: Record<PermissionGroup, PermissionDef[]> = permissionGroups.reduce(
  (accumulator, group) => {
    accumulator[group] = allPermissions.filter((permission) => permission.group === group);
    return accumulator;
  },
  {} as Record<PermissionGroup, PermissionDef[]>,
);

export const roleOrder: UserRole[] = ['admin', 'owner', 'engineer', 'reviewer', 'reader'];

export const roleDefinitions: RoleDefinition[] = [
  {
    role: 'admin',
    label: roleLabels.admin,
    description: 'Gobierno completo: cuentas, permisos, cuotas y políticas de la plataforma.',
    permissions: allPermissions.map((permission) => permission.id),
  },
  {
    role: 'owner',
    label: roleLabels.owner,
    description: 'Responsable de proyecto: equipo, datasets, entrenamientos y aprobación.',
    permissions: [
      'projects.create',
      'projects.members',
      'datasets.publish',
      'architectures.edit',
      'jobs.launch',
      'jobs.cancel',
      'jobs.prioritize',
      'models.approve',
      'reports.export',
    ],
  },
  {
    role: 'engineer',
    label: roleLabels.engineer,
    description: 'Ingeniería de IA: arquitecturas, datasets y ejecuciones propias.',
    permissions: [
      'architectures.edit',
      'datasets.publish',
      'jobs.launch',
      'jobs.cancel',
      'reports.export',
    ],
  },
  {
    role: 'reviewer',
    label: roleLabels.reviewer,
    description: 'Revisión de modelos y trazabilidad; sin acceso a la consola de gobierno.',
    permissions: ['audit.read', 'models.approve', 'reports.export'],
  },
  {
    role: 'reader',
    label: roleLabels.reader,
    description: 'Consulta de resultados sin permisos de escritura ni exportación.',
    permissions: [],
  },
];

export const roleDefinitionOf = (role: UserRole): RoleDefinition =>
  roleDefinitions.find((definition) => definition.role === role) ?? roleDefinitions[0];

export const canRole = (role: UserRole, permissionId: string): boolean =>
  roleDefinitionOf(role).permissions.includes(permissionId);

export const permissionOf = (permissionId: string): PermissionDef | undefined =>
  allPermissions.find((permission) => permission.id === permissionId);

/* --- Estados de cuenta ----------------------------------------------------------- */

export const accountStatusMeta: Record<
  AccountStatus,
  { label: string; tone: 'neutral' | 'preparing' | 'completed' | 'cancelled' | 'failed'; hint: string }
> = {
  ACTIVE: { label: 'Activa', tone: 'completed', hint: 'La cuenta puede iniciar sesión según su rol.' },
  INVITED: { label: 'Invitada', tone: 'preparing', hint: 'Invitación enviada; aún no aceptada.' },
  SUSPENDED: { label: 'Suspendida', tone: 'cancelled', hint: 'Acceso revocado por administración.' },
  LOCKED: { label: 'Bloqueada', tone: 'failed', hint: 'Bloqueo automático por intentos fallidos.' },
};

export const statusActionMeta: Record<
  AccountStatus,
  { label: string; next: AccountStatus; auditLabel: string }
> = {
  ACTIVE: { label: 'Suspender', next: 'SUSPENDED', auditLabel: 'Cuenta suspendida' },
  INVITED: { label: 'Revocar invitación', next: 'SUSPENDED', auditLabel: 'Invitación revocada' },
  SUSPENDED: { label: 'Reactivar', next: 'ACTIVE', auditLabel: 'Cuenta reactivada' },
  LOCKED: { label: 'Desbloquear', next: 'ACTIVE', auditLabel: 'Cuenta desbloqueada' },
};

/* --- Auditoría ------------------------------------------------------------------- */

export const auditCategoryMeta: Record<AuditCategory, { label: string; icon: IconName }> = {
  ACCESO: { label: 'Acceso', icon: 'lock' },
  PERMISOS: { label: 'Permisos', icon: 'users' },
  RECURSOS: { label: 'Recursos', icon: 'server' },
  CONFIGURACION: { label: 'Configuración', icon: 'settings' },
  DATASETS: { label: 'Datasets', icon: 'dataset' },
  ENTRENAMIENTOS: { label: 'Entrenamientos', icon: 'training' },
  MODELOS: { label: 'Modelos', icon: 'model' },
  EXPORTACIONES: { label: 'Exportaciones', icon: 'download' },
};

export const auditCategories = Object.keys(auditCategoryMeta) as AuditCategory[];

export const auditSeverityMeta: Record<
  AuditSeverity,
  { label: string; tone: 'neutral' | 'preparing' | 'failed' }
> = {
  info: { label: 'Informativo', tone: 'neutral' },
  warning: { label: 'Advertencia', tone: 'preparing' },
  critical: { label: 'Crítico', tone: 'failed' },
};

export const auditSeverities: AuditSeverity[] = ['info', 'warning', 'critical'];

export const nextAuditId = (events: AuditEvent[]): string => {
  const highest = events.reduce((max, event) => {
    const numeric = Number.parseInt(event.id.replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 9000);
  return `AUD-${highest + 1}`;
};

export const createAuditEvent = (
  draft: AuditDraft,
  actor: Actor,
  events: AuditEvent[],
): AuditEvent => ({
  id: nextAuditId(events),
  createdAt: new Date().toISOString(),
  actorId: actor.id,
  actorName: actor.displayName,
  actorRole: actor.role,
  action: draft.action,
  label: draft.label,
  category: draft.category,
  target: draft.target,
  projectId: draft.projectId ?? null,
  projectName: draft.projectName ?? null,
  severity: draft.severity,
  ip: '10.20.4.18',
  metadata: draft.metadata,
});

export interface AuditFilter {
  query: string;
  category: AuditCategory | 'ALL';
  severity: AuditSeverity | 'ALL';
}

export const filterAudit = (events: AuditEvent[], filter: AuditFilter): AuditEvent[] => {
  const term = filter.query.trim().toLowerCase();
  return events.filter((event) => {
    if (filter.category !== 'ALL' && event.category !== filter.category) return false;
    if (filter.severity !== 'ALL' && event.severity !== filter.severity) return false;
    if (!term) return true;
    const haystack = [
      event.label,
      event.action,
      event.actorName,
      event.target,
      event.projectName ?? '',
      event.ip,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
};

const csvCell = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export const auditCsv = (events: AuditEvent[]): string => {
  const header = ['id', 'fecha', 'actor', 'rol', 'categoria', 'accion', 'objetivo', 'proyecto', 'severidad', 'ip'];
  const rows = events.map((event) => [
    event.id,
    event.createdAt,
    event.actorName,
    roleLabels[event.actorRole] ?? event.actorRole,
    auditCategoryMeta[event.category].label,
    event.action,
    event.target,
    event.projectName ?? '',
    auditSeverityMeta[event.severity].label,
    event.ip,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
};

/* --- Límites de recursos ---------------------------------------------------------- */

export const limitRatio = (limit: ResourceLimit, value: number = limit.limit): number =>
  value <= 0 ? 0 : Math.min(1, limit.used / value);

export const limitTone = (limit: ResourceLimit, value: number = limit.limit) =>
  toneForUsage(limitRatio(limit, value));

export const validateLimit = (limit: ResourceLimit, value: number): string | null => {
  if (!Number.isFinite(value)) return 'Indique un valor numérico.';
  if (value < limit.min) return `El mínimo permitido es ${limit.min} ${limit.unit}.`;
  if (value > limit.max) return `El máximo permitido es ${limit.max} ${limit.unit}.`;
  if (value < limit.used) {
    return `No puede quedar por debajo del consumo actual (${limit.used} ${limit.unit}).`;
  }
  return null;
};

/* --- Políticas de seguridad -------------------------------------------------------- */

export const mfaPolicyLabels: Record<MfaPolicy, string> = {
  ADMINS: 'Obligatorio para administradores',
  ALL: 'Obligatorio para todas las cuentas',
  OPTIONAL: 'Opcional (no recomendado)',
};

export interface SettingsErrors {
  sessionMinutes?: string;
  auditRetentionDays?: string;
  artifactRetentionDays?: string;
  metricsRetentionDays?: string;
}

export const validateSettings = (settings: SecuritySettings): SettingsErrors => {
  const errors: SettingsErrors = {};
  if (!Number.isFinite(settings.sessionMinutes) || settings.sessionMinutes < 5 || settings.sessionMinutes > 120) {
    errors.sessionMinutes = 'Entre 5 y 120 minutos.';
  }
  if (
    !Number.isFinite(settings.auditRetentionDays) ||
    settings.auditRetentionDays < 30 ||
    settings.auditRetentionDays > 730
  ) {
    errors.auditRetentionDays = 'Entre 30 y 730 días.';
  }
  if (
    !Number.isFinite(settings.artifactRetentionDays) ||
    settings.artifactRetentionDays < 7 ||
    settings.artifactRetentionDays > 365
  ) {
    errors.artifactRetentionDays = 'Entre 7 y 365 días.';
  }
  if (
    !Number.isFinite(settings.metricsRetentionDays) ||
    settings.metricsRetentionDays < 30 ||
    settings.metricsRetentionDays > 365
  ) {
    errors.metricsRetentionDays = 'Entre 30 y 365 días.';
  }
  return errors;
};

/* --- Salud ------------------------------------------------------------------------ */

export const serviceStatusMeta: Record<
  ServiceStatus,
  { label: string; tone: 'completed' | 'preparing' | 'failed' }
> = {
  HEALTHY: { label: 'Operativo', tone: 'completed' },
  DEGRADED: { label: 'Degradado', tone: 'preparing' },
  DOWN: { label: 'Caído', tone: 'failed' },
};

/* --- Cuentas ---------------------------------------------------------------------- */

export const nextUserId = (users: AdminUser[]): string => {
  const highest = users.reduce((max, user) => {
    const numeric = Number.parseInt(user.id.replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 200);
  return `USR-${highest + 1}`;
};

export const initialsOf = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const isEmailValid = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export const validateInvite = (
  draft: { displayName: string; email: string },
  existingEmails: string[],
): string | null => {
  if (draft.displayName.trim().length < 3) return 'Escriba el nombre completo (mínimo 3 caracteres).';
  if (!isEmailValid(draft.email)) return 'Indique un correo corporativo válido.';
  if (existingEmails.some((email) => email.toLowerCase() === draft.email.trim().toLowerCase())) {
    return 'Ya existe una cuenta con ese correo.';
  }
  return null;
};
