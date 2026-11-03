import type {
  AdminUser,
  AuditEvent,
  AuditSeverity,
  ResourceLimit,
  SecuritySettings,
  ServiceHealth,
} from '@/types/administration';
import type { UserRole } from '@/types/domain';
import { directoryUsers } from '@/lib/mock/projects';

const NOW = Date.now();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

/* --- Cuentas ------------------------------------------------------------------- */

interface AccountMeta {
  status: AdminUser['status'];
  mfaEnabled: boolean;
  projects: number;
  lastAccessMinutes: number | null;
  createdDaysAgo: number;
  statusReason?: string;
}

const ACCOUNT_META: Record<string, AccountMeta> = {
  'USR-207': { status: 'ACTIVE', mfaEnabled: true, projects: 2, lastAccessMinutes: 26, createdDaysAgo: 214 },
  'USR-212': { status: 'ACTIVE', mfaEnabled: false, projects: 2, lastAccessMinutes: 128, createdDaysAgo: 198 },
  'USR-218': { status: 'ACTIVE', mfaEnabled: true, projects: 3, lastAccessMinutes: 306, createdDaysAgo: 176 },
  'USR-223': { status: 'ACTIVE', mfaEnabled: true, projects: 2, lastAccessMinutes: 1_470, createdDaysAgo: 240 },
  'USR-231': {
    status: 'SUSPENDED',
    mfaEnabled: false,
    projects: 1,
    lastAccessMinutes: 8_640,
    createdDaysAgo: 155,
    statusReason: 'Cuenta suspendida el 24 oct 2026 por uso compartido de credenciales.',
  },
  'USR-236': { status: 'ACTIVE', mfaEnabled: false, projects: 2, lastAccessMinutes: 187, createdDaysAgo: 132 },
  'USR-244': {
    status: 'LOCKED',
    mfaEnabled: true,
    projects: 2,
    lastAccessMinutes: 17_280,
    createdDaysAgo: 121,
    statusReason: 'Bloqueo automático tras 5 intentos fallidos de MFA el 17 oct 2026.',
  },
  'USR-251': {
    status: 'INVITED',
    mfaEnabled: false,
    projects: 0,
    lastAccessMinutes: null,
    createdDaysAgo: 2,
    statusReason: 'Invitación enviada el 27 oct 2026; pendiente de aceptación.',
  },
};

/** Cuenta administradora con la que se abre la consola de gobierno. */
export const consoleAdmin: AdminUser = {
  id: 'USR-202',
  displayName: 'Patricia Alcántara Ruiz',
  email: 'patricia.alcantara@neurolab.enterprise',
  initials: 'PA',
  title: 'Directora de plataforma',
  role: 'admin',
  status: 'ACTIVE',
  mfaEnabled: true,
  projects: 3,
  lastAccessAt: minutesAgo(8),
  createdAt: daysAgo(268),
};

export const seedUsers: AdminUser[] = [
  consoleAdmin,
  ...directoryUsers.map((user) => {
    const meta = ACCOUNT_META[user.id];
    return {
      ...user,
      status: meta.status,
      mfaEnabled: meta.mfaEnabled,
      projects: meta.projects,
      lastAccessAt:
        meta.lastAccessMinutes === null ? null : minutesAgo(meta.lastAccessMinutes),
      createdAt: daysAgo(meta.createdDaysAgo),
      statusReason: meta.statusReason,
    };
  }),
];

/* --- Auditoría ------------------------------------------------------------------ */

const actors: Record<string, { name: string; role: UserRole }> = {
  'USR-202': { name: consoleAdmin.displayName, role: 'admin' },
  ...Object.fromEntries(directoryUsers.map((user) => [user.id, { name: user.displayName, role: user.role }])),
};

interface AuditSeed {
  id: string;
  minutesAgo: number;
  actorId: string;
  action: string;
  label: string;
  category: AuditEvent['category'];
  target: string;
  projectId?: string;
  projectName?: string;
  severity?: AuditSeverity;
  ip?: string;
  metadata: AuditEvent['metadata'];
}

const AUDIT_SEED: AuditSeed[] = [
  {
    id: 'AUD-9142',
    minutesAgo: 9,
    actorId: 'USR-202',
    action: 'auth.login',
    label: 'Inicio de sesión con MFA',
    category: 'ACCESO',
    target: 'Consola de administración',
    ip: '10.20.4.18',
    metadata: { metodo: 'OIDC + TOTP', mfa: true, sesion: '45 min' },
  },
  {
    id: 'AUD-9141',
    minutesAgo: 26,
    actorId: 'USR-207',
    action: 'job.launched',
    label: 'Entrenamiento lanzado',
    category: 'ENTRENAMIENTOS',
    target: 'TR-2064 · CNN-Deep',
    projectId: 'PRJ-126',
    projectName: 'Visión industrial de juntas',
    ip: '10.20.4.22',
    metadata: { epocas: 28, lote: 32, optimizador: 'AdamW', gpu: 1 },
  },
  {
    id: 'AUD-9140',
    minutesAgo: 63,
    actorId: 'USR-207',
    action: 'report.exported',
    label: 'Exportación de reportes',
    category: 'EXPORTACIONES',
    target: 'Reporte PRJ-126 · PDF',
    projectId: 'PRJ-126',
    projectName: 'Visión industrial de juntas',
    severity: 'warning',
    ip: '10.20.4.22',
    metadata: { formato: 'PDF', filas: 42, revision: 'aprobada' },
  },
  {
    id: 'AUD-9139',
    minutesAgo: 122,
    actorId: 'USR-202',
    action: 'user.role_changed',
    label: 'Cambio de rol',
    category: 'PERMISOS',
    target: 'Luis Paredes Soto · USR-212',
    severity: 'warning',
    ip: '10.20.4.18',
    metadata: { rolAnterior: 'reader', rolNuevo: 'engineer', origen: 'consola' },
  },
  {
    id: 'AUD-9138',
    minutesAgo: 198,
    actorId: 'USR-218',
    action: 'model.approved',
    label: 'Versión de modelo aprobada',
    category: 'MODELOS',
    target: 'MDL-118 · versión 3.2',
    projectId: 'PRJ-118',
    projectName: 'Scoring de riesgo de fuga',
    ip: '10.20.4.31',
    metadata: { checksum: 'sha256:9d1f…c04a', revisor: 'USR-218', estado: 'APROBADO' },
  },
  {
    id: 'AUD-9137',
    minutesAgo: 254,
    actorId: 'USR-244',
    action: 'auth.locked',
    label: 'Cuenta bloqueada por intentos fallidos',
    category: 'ACCESO',
    target: 'Elena Torres Gil · USR-244',
    severity: 'critical',
    ip: '181.65.22.9',
    metadata: { intentos: 5, ventana: '10 min', accion: 'Bloqueo automático' },
  },
  {
    id: 'AUD-9136',
    minutesAgo: 312,
    actorId: 'USR-207',
    action: 'dataset.published',
    label: 'Dataset publicado',
    category: 'DATASETS',
    target: 'Acero laminado · v3.2',
    projectId: 'PRJ-126',
    projectName: 'Visión industrial de juntas',
    ip: '10.20.4.22',
    metadata: { registros: 4_820, particiones: '70/15/15', controles: 'superados' },
  },
  {
    id: 'AUD-9135',
    minutesAgo: 428,
    actorId: 'USR-202',
    action: 'limits.updated',
    label: 'Límite de GPU modificado',
    category: 'RECURSOS',
    target: 'GPU concurrentes',
    severity: 'warning',
    ip: '10.20.4.18',
    metadata: { anterior: 2, nuevo: 4, motivo: 'Ampliación temporal de capacidad' },
  },
  {
    id: 'AUD-9134',
    minutesAgo: 1_520,
    actorId: 'USR-202',
    action: 'settings.updated',
    label: 'Política de retención actualizada',
    category: 'CONFIGURACION',
    target: 'Retención de auditoría y artefactos',
    ip: '10.20.4.18',
    metadata: { auditoriaDias: 365, artefactosDias: 90, metricasDias: 180 },
  },
  {
    id: 'AUD-9133',
    minutesAgo: 1_610,
    actorId: 'USR-223',
    action: 'job.cancel_requested',
    label: 'Cancelación solicitada',
    category: 'ENTRENAMIENTOS',
    target: 'TR-2059 · ResNet-34',
    projectId: 'PRJ-121',
    projectName: 'Detección de fraude transaccional',
    severity: 'warning',
    ip: '10.20.4.27',
    metadata: { motivo: 'Parámetros de validación desactualizados', confirmada: true },
  },
  {
    id: 'AUD-9132',
    minutesAgo: 1_690,
    actorId: 'USR-202',
    action: 'session.revoked',
    label: 'Sesión revocada',
    category: 'ACCESO',
    target: 'Carla Núñez Prado · USR-231',
    severity: 'warning',
    ip: '10.20.4.18',
    metadata: { motivo: 'Suspensión de cuenta', sesionesCerradas: 2 },
  },
  {
    id: 'AUD-9131',
    minutesAgo: 2_760,
    actorId: 'USR-236',
    action: 'permission.denied',
    label: 'Elevación de privilegios denegada',
    category: 'PERMISOS',
    target: 'roles.manage',
    severity: 'critical',
    ip: '10.20.4.25',
    metadata: { rol: 'engineer', politica: 'RBAC', recurso: 'matriz de permisos' },
  },
  {
    id: 'AUD-9130',
    minutesAgo: 2_930,
    actorId: 'USR-202',
    action: 'audit.exported',
    label: 'Exportación de auditoría',
    category: 'EXPORTACIONES',
    target: 'Últimos 120 eventos',
    ip: '10.20.4.18',
    metadata: { formato: 'CSV', eventos: 120, rango: '30 días' },
  },
  {
    id: 'AUD-9129',
    minutesAgo: 4_380,
    actorId: 'USR-212',
    action: 'dataset.validated',
    label: 'Dataset validado',
    category: 'DATASETS',
    target: 'Fraude transaccional · v2.1',
    projectId: 'PRJ-121',
    projectName: 'Detección de fraude transaccional',
    ip: '10.20.4.24',
    metadata: { controles: 6, advertencias: 1, decision: 'publicable' },
  },
  {
    id: 'AUD-9128',
    minutesAgo: 5_820,
    actorId: 'USR-202',
    action: 'settings.updated',
    label: 'MFA obligatorio para administradores',
    category: 'CONFIGURACION',
    target: 'Política de autenticación',
    severity: 'warning',
    ip: '10.20.4.18',
    metadata: { politica: 'ADMINS', anterior: 'OPTIONAL' },
  },
  {
    id: 'AUD-9127',
    minutesAgo: 8_700,
    actorId: 'USR-218',
    action: 'model.retired',
    label: 'Versión de modelo retirada',
    category: 'MODELOS',
    target: 'MDL-121 · versión 1.4',
    projectId: 'PRJ-121',
    projectName: 'Detección de fraude transaccional',
    severity: 'warning',
    ip: '10.20.4.31',
    metadata: { motivo: 'Deriva de datos', sucesora: 'versión 2.1' },
  },
];

export const seedAudit: AuditEvent[] = AUDIT_SEED.map((seed) => {
  const actor = actors[seed.actorId];
  return {
    id: seed.id,
    createdAt: minutesAgo(seed.minutesAgo),
    actorId: seed.actorId,
    actorName: actor.name,
    actorRole: actor.role,
    action: seed.action,
    label: seed.label,
    category: seed.category,
    target: seed.target,
    projectId: seed.projectId ?? null,
    projectName: seed.projectName ?? null,
    severity: seed.severity ?? 'info',
    ip: seed.ip ?? '10.20.4.18',
    metadata: seed.metadata,
  };
});

/* --- Límites de recursos --------------------------------------------------------- */

export const seedLimits: ResourceLimit[] = [
  {
    id: 'gpu',
    label: 'GPU concurrentes',
    unit: 'trabajos',
    used: 3,
    limit: 4,
    min: 1,
    max: 8,
    step: 1,
    hint: 'Carriles de cómputo que puede ocupar la plataforma a la vez.',
  },
  {
    id: 'concurrency',
    label: 'Entrenamientos concurrentes',
    unit: 'trabajos',
    used: 4,
    limit: 6,
    min: 2,
    max: 12,
    step: 1,
    hint: 'Trabajos en ejecución simultánea por encima de la cola de GPU.',
  },
  {
    id: 'cpu',
    label: 'CPU por trabajo',
    unit: 'núcleos',
    used: 6,
    limit: 8,
    min: 2,
    max: 16,
    step: 1,
    hint: 'Núcleos reservados a cada worker de entrenamiento.',
  },
  {
    id: 'memory',
    label: 'Memoria por trabajo',
    unit: 'GB',
    used: 12,
    limit: 16,
    min: 4,
    max: 64,
    step: 2,
    hint: 'Memoria máxima del worker; protege al proceso principal (RN-03).',
  },
  {
    id: 'duration',
    label: 'Duración máxima',
    unit: 'min',
    used: 182,
    limit: 240,
    min: 30,
    max: 480,
    step: 30,
    hint: 'Tiempo máximo por ejecución antes del cierre controlado.',
  },
  {
    id: 'storage',
    label: 'Cuota de almacenamiento',
    unit: 'GB',
    used: 384,
    limit: 500,
    min: 50,
    max: 2_000,
    step: 25,
    hint: 'Artefactos, datasets y versiones de modelo en almacenamiento de objetos.',
  },
];

/* --- Políticas y salud ------------------------------------------------------------ */

export const seedSettings: SecuritySettings = {
  sessionMinutes: 45,
  mfaPolicy: 'ADMINS',
  auditRetentionDays: 365,
  artifactRetentionDays: 90,
  metricsRetentionDays: 180,
  exportRequiresReview: true,
};

export const seedHealth: ServiceHealth[] = [
  {
    id: 'api',
    label: 'API de plataforma',
    status: 'HEALTHY',
    detail: 'FastAPI · 4 procesos activos',
    latencyMs: 96,
  },
  {
    id: 'db',
    label: 'PostgreSQL',
    status: 'HEALTHY',
    detail: 'Réplica al día · última copia 02:00',
    latencyMs: 12,
  },
  {
    id: 'workers',
    label: 'Workers de entrenamiento',
    status: 'DEGRADED',
    detail: '4 de 6 en línea; 2 reiniciando',
    latencyMs: null,
  },
  {
    id: 'storage',
    label: 'Almacenamiento de objetos',
    status: 'HEALTHY',
    detail: 'Cifrado SSE-S3 · 99,98 % disponibilidad',
    latencyMs: 38,
  },
  {
    id: 'events',
    label: 'Canal SSE / WebSocket',
    status: 'HEALTHY',
    detail: '142 conexiones autenticadas',
    latencyMs: 21,
  },
  {
    id: 'identity',
    label: 'Proveedor de identidad',
    status: 'HEALTHY',
    detail: 'OIDC · MFA para administradores',
    latencyMs: 64,
  },
];

export function seedAdministration() {
  return {
    users: seedUsers.map((user) => ({ ...user })),
    audit: seedAudit.map((event) => ({ ...event, metadata: { ...event.metadata } })),
    limits: seedLimits.map((limit) => ({ ...limit })),
    settings: { ...seedSettings },
  };
}
