import { useEffect, useMemo, useState } from 'react';
import type {
  AdministrationSnapshot,
  AdminUser,
  AuditDraft,
  AuditEvent,
  InviteDraft,
  ResourceLimitId,
  SecuritySettings,
} from '@/types/administration';
import type { UserRole } from '@/types/domain';
import {
  consoleAdmin,
  seedAdministration,
  seedHealth,
} from '@/lib/mock/administration';
import { demoActor } from '@/lib/session';
import { roleLabels } from '@/lib/nav';
import { formatDate, formatNumber, formatRelativeTime, percentage } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { UsersPanel } from '@/features/administration/UsersPanel';
import { PermissionMatrix } from '@/features/administration/PermissionMatrix';
import { AuditPanel } from '@/features/administration/AuditPanel';
import { LimitsPanel } from '@/features/administration/LimitsPanel';
import { PolicyPanel } from '@/features/administration/PolicyPanel';
import { HealthPanel } from '@/features/administration/HealthPanel';
import { InviteDialog } from '@/features/administration/InviteDialog';
import { AdminModal } from '@/features/administration/AdminModal';
import {
  auditCsv,
  createAuditEvent,
  initialsOf,
  mfaPolicyLabels,
  nextUserId,
  roleDefinitions,
  statusActionMeta,
} from '@/features/administration/model';

const STORAGE_KEY = 'neurolab.administration.v1';

type AdminDialog = 'matrix' | 'health' | 'audit' | 'limits' | 'policy';

interface Notice {
  tone: 'success' | 'info';
  text: string;
}

const SETTING_LABELS: Record<keyof SecuritySettings, string> = {
  sessionMinutes: 'sesión',
  mfaPolicy: 'MFA',
  auditRetentionDays: 'retención de auditoría',
  artifactRetentionDays: 'retención de artefactos',
  metricsRetentionDays: 'retención de métricas',
  exportRequiresReview: 'revisión de exportaciones',
};

function loadSnapshot(): AdministrationSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedAdministration();
    const parsed = JSON.parse(raw) as Partial<AdministrationSnapshot>;
    if (
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.audit) ||
      !Array.isArray(parsed.limits) ||
      !parsed.settings
    ) {
      return seedAdministration();
    }
    return {
      users: parsed.users,
      audit: parsed.audit,
      limits: parsed.limits,
      settings: parsed.settings,
    };
  } catch {
    return seedAdministration();
  }
}

function withAudit(
  previous: AdministrationSnapshot,
  draft: AuditDraft,
  patch: Partial<AdministrationSnapshot>,
): AdministrationSnapshot {
  const event = createAuditEvent(draft, consoleAdmin, previous.audit);
  return { ...previous, ...patch, audit: [event, ...previous.audit] };
}

export function AdministrationPage() {
  const [snapshot, setSnapshot] = useState<AdministrationSnapshot>(loadSnapshot);
  const [checkedAt, setCheckedAt] = useState(() => new Date().toISOString());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<AdminDialog | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* almacenamiento no disponible: la demo sigue en memoria */
    }
  }, [snapshot]);

  const metrics = useMemo(() => {
    const total = snapshot.users.length;
    const active = snapshot.users.filter((user) => user.status === 'ACTIVE').length;
    const mfa = snapshot.users.filter((user) => user.status === 'ACTIVE' && user.mfaEnabled).length;
    const critical = snapshot.audit.filter((event) => event.severity === 'critical').length;
    const warnings = snapshot.audit.filter((event) => event.severity === 'warning').length;
    const gpu = snapshot.limits.find((limit) => limit.id === 'gpu') ?? snapshot.limits[0];
    return { total, active, mfa, critical, warnings, gpu };
  }, [snapshot]);

  const health = useMemo(() => {
    const degraded = seedHealth.filter((service) => service.status !== 'HEALTHY').length;
    return { healthy: seedHealth.length - degraded, degraded };
  }, []);

  const assignments = useMemo(
    () => roleDefinitions.reduce((total, role) => total + role.permissions.length, 0),
    [],
  );

  const handleRoleChange = (userId: string, role: UserRole) => {
    if (userId === consoleAdmin.id) {
      setNotice({
        tone: 'info',
        text: 'El último administrador no puede cambiar su propio rol desde esta consola.',
      });
      return;
    }
    const user = snapshot.users.find((item) => item.id === userId);
    if (!user || user.role === role) return;
    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: 'user.role_changed',
          label: 'Cambio de rol global',
          category: 'PERMISOS',
          target: `${user.displayName} · ${user.id}`,
          severity: 'warning',
          metadata: { rolAnterior: roleLabels[user.role], rolNuevo: roleLabels[role] },
        },
        {
          users: previous.users.map((item) => (item.id === userId ? { ...item, role } : item)),
        },
      ),
    );
    setNotice({
      tone: 'success',
      text: `${user.displayName} ahora tiene el rol ${roleLabels[role].toLowerCase()}.`,
    });
  };

  const handleToggleStatus = (userId: string) => {
    if (userId === consoleAdmin.id) {
      setNotice({
        tone: 'info',
        text: 'La cuenta de la sesión de gobierno no puede suspenderse a sí misma.',
      });
      return;
    }
    const user = snapshot.users.find((item) => item.id === userId);
    if (!user) return;
    const action = statusActionMeta[user.status];
    const nextStatus = action.next;
    const actionName =
      user.status === 'INVITED'
        ? 'user.invite_revoked'
        : nextStatus === 'ACTIVE'
          ? 'user.reactivated'
          : 'user.suspended';
    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: actionName,
          label: action.auditLabel,
          category: 'PERMISOS',
          target: `${user.displayName} · ${user.id}`,
          severity: nextStatus === 'SUSPENDED' ? 'warning' : 'info',
          metadata: { estadoAnterior: user.status, estadoNuevo: nextStatus, sesionesRevocadas: 2 },
        },
        {
          users: previous.users.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  status: nextStatus,
                  statusReason:
                    nextStatus === 'ACTIVE'
                      ? undefined
                      : `${action.auditLabel} desde la consola el ${formatDate(new Date().toISOString())}.`,
                }
              : item,
          ),
        },
      ),
    );
    setNotice({
      tone: 'success',
      text: `${user.displayName}: ${action.auditLabel.toLowerCase()}.`,
    });
  };

  const handleInvite = (draft: InviteDraft) => {
    const now = new Date();
    const record: AdminUser = {
      id: nextUserId(snapshot.users),
      displayName: draft.displayName,
      email: draft.email,
      initials: initialsOf(draft.displayName),
      title: roleLabels[draft.role],
      role: draft.role,
      status: 'INVITED',
      mfaEnabled: false,
      projects: 0,
      lastAccessAt: null,
      createdAt: now.toISOString(),
      statusReason: `Invitación enviada el ${formatDate(now.toISOString())}; pendiente de aceptación.`,
    };
    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: 'user.invited',
          label: 'Invitación enviada',
          category: 'PERMISOS',
          target: `${record.displayName} · ${record.id}`,
          severity: 'info',
          metadata: {
            correo: record.email,
            rol: roleLabels[record.role],
            vigencia: '7 días',
          },
        },
        { users: [record, ...previous.users] },
      ),
    );
    setInviteOpen(false);
    setNotice({
      tone: 'success',
      text: `Invitación enviada a ${record.email}. La cuenta queda pendiente de aceptación.`,
    });
  };

  const handleApplyLimit = (id: ResourceLimitId, value: number) => {
    const limit = snapshot.limits.find((item) => item.id === id);
    if (!limit || value === limit.limit) return;
    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: 'limits.updated',
          label: 'Límite de recursos modificado',
          category: 'RECURSOS',
          target: limit.label,
          severity: 'warning',
          metadata: { anterior: limit.limit, nuevo: value, unidad: limit.unit },
        },
        {
          limits: previous.limits.map((item) =>
            item.id === id ? { ...item, limit: value } : item,
          ),
        },
      ),
    );
    setNotice({
      tone: 'success',
      text: `${limit.label}: ${formatNumber(value)} ${limit.unit} (antes ${formatNumber(limit.limit)}).`,
    });
  };

  const handleSaveSettings = (next: SecuritySettings) => {
    const changed = (Object.keys(next) as (keyof SecuritySettings)[]).filter(
      (key) => snapshot.settings[key] !== next[key],
    );
    if (changed.length === 0) {
      setNotice({ tone: 'info', text: 'No hay cambios pendientes en las políticas.' });
      return;
    }
    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: 'settings.updated',
          label: 'Políticas de seguridad actualizadas',
          category: 'CONFIGURACION',
          target: 'Sesión, MFA y retención',
          severity: 'warning',
          metadata: {
            campos: changed.length,
            auditoriaDias: next.auditRetentionDays,
            artefactosDias: next.artifactRetentionDays,
            metricasDias: next.metricsRetentionDays,
            revisionExportacion: next.exportRequiresReview,
          },
        },
        { settings: next },
      ),
    );
    setNotice({
      tone: 'success',
      text: `Políticas actualizadas: ${changed.map((key) => SETTING_LABELS[key]).join(', ')}.`,
    });
    setOpenDialog(null);
  };

  const handleExportAudit = (events: AuditEvent[]) => {
    const csv = auditCsv(events);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-neurolab-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setSnapshot((previous) =>
      withAudit(
        previous,
        {
          action: 'audit.exported',
          label: 'Exportación de auditoría',
          category: 'EXPORTACIONES',
          target: `${events.length} eventos · CSV`,
          severity: 'warning',
          metadata: { formato: 'CSV', eventos: events.length, origen: 'consola de gobierno' },
        },
        {},
      ),
    );
    setNotice({
      tone: 'success',
      text: `Se descargaron ${events.length} eventos en CSV. La exportación quedó registrada.`,
    });
    setOpenDialog(null);
  };

  const handleRefreshHealth = () => {
    setCheckedAt(new Date().toISOString());
    setNotice({
      tone: 'info',
      text: `Salud verificada: ${health.healthy} servicios operativos y ${health.degraded} con avisos.`,
    });
  };

  const resetDemo = () => {
    setSnapshot(seedAdministration());
    setCheckedAt(new Date().toISOString());
    setNotice({
      tone: 'info',
      text: 'Administración demo restaurada: cuentas, auditoría, cuotas y políticas originales.',
    });
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="shield" size={14} strokeWidth={2} />
            M10 · Administración y seguridad
          </p>
          <h1 className="page-head__title">Gobierno de cuentas, permisos y operación</h1>
          <p className="page-head__lede">
            Administre altas y roles globales, revise la matriz RBAC y la auditoría de acciones,
            ajuste los límites de recursos y las políticas de retención. Toda modificación queda
            trazada con actor, objetivo y origen.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={resetDemo}>
            <Icon name="refresh" size={16} />
            Restaurar demo
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            <Icon name="userPlus" size={16} />
            Invitar usuario
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

      <div className="dash adm-page">
        <section className="adm-quick" aria-label="Vistas de gobierno">
          <button
            type="button"
            className="adm-quick__item"
            onClick={() => setOpenDialog('matrix')}
          >
            <span className="adm-quick__icon">
              <Icon name="shield" size={18} strokeWidth={1.9} />
            </span>
            <span className="adm-quick__text">
              <strong>Matriz de permisos</strong>
              <span>
                {assignments} asignaciones en 5 roles · política RBAC vigente
              </span>
            </span>
            <Icon name="chevronRight" size={16} className="adm-quick__chevron" />
          </button>

          <button
            type="button"
            className="adm-quick__item"
            onClick={() => setOpenDialog('health')}
          >
            <span className="adm-quick__icon">
              <Icon name="gauge" size={18} strokeWidth={1.9} />
            </span>
            <span className="adm-quick__text">
              <strong>Salud del sistema</strong>
              <span>
                {health.healthy} operativos · {health.degraded} con avisos ·{' '}
                {formatRelativeTime(checkedAt)}
              </span>
            </span>
            <Chip tone={health.degraded > 0 ? 'preparing' : 'completed'} dot>
              {health.degraded > 0 ? 'Con avisos' : 'Operativo'}
            </Chip>
            <Icon name="chevronRight" size={16} className="adm-quick__chevron" />
          </button>

          <button
            type="button"
            className="adm-quick__item"
            onClick={() => setOpenDialog('audit')}
          >
            <span className="adm-quick__icon">
              <Icon name="fileText" size={18} strokeWidth={1.9} />
            </span>
            <span className="adm-quick__text">
              <strong>Auditoría de acciones</strong>
              <span>
                {snapshot.audit.length} eventos · {metrics.critical} críticos · retención{' '}
                {snapshot.settings.auditRetentionDays} días
              </span>
            </span>
            <Icon name="chevronRight" size={16} className="adm-quick__chevron" />
          </button>

          <button
            type="button"
            className="adm-quick__item"
            onClick={() => setOpenDialog('limits')}
          >
            <span className="adm-quick__icon">
              <Icon name="server" size={18} strokeWidth={1.9} />
            </span>
            <span className="adm-quick__text">
              <strong>Límites de recursos</strong>
              <span>
                {metrics.gpu.used}/{metrics.gpu.limit} GPU en uso · {snapshot.limits.length}{' '}
                cuotas vigentes
              </span>
            </span>
            <Icon name="chevronRight" size={16} className="adm-quick__chevron" />
          </button>

          <button
            type="button"
            className="adm-quick__item"
            onClick={() => setOpenDialog('policy')}
          >
            <span className="adm-quick__icon">
              <Icon name="settings" size={18} strokeWidth={1.9} />
            </span>
            <span className="adm-quick__text">
              <strong>Políticas de seguridad</strong>
              <span>
                Sesión {snapshot.settings.sessionMinutes} min ·{' '}
                {mfaPolicyLabels[snapshot.settings.mfaPolicy]} · retención{' '}
                {snapshot.settings.auditRetentionDays} días
              </span>
            </span>
            <Icon name="chevronRight" size={16} className="adm-quick__chevron" />
          </button>
        </section>

        <section className="adm-session" aria-label="Sesión de administración">
          <span className="avatar avatar--lg" aria-hidden="true">
            {consoleAdmin.initials}
          </span>
          <div className="adm-session__identity">
            <strong>{consoleAdmin.displayName}</strong>
            <span>
              {consoleAdmin.title} · <span className="u-mono">{consoleAdmin.id}</span>
            </span>
          </div>
          <div className="adm-session__chips">
            <Chip tone="completed" dot>
              Administradora
            </Chip>
            <Chip tone="outline">
              <Icon name="lock" size={12} />
              MFA verificado
            </Chip>
            <Chip tone="outline">
              <Icon name="clock" size={12} />
              Sesión {snapshot.settings.sessionMinutes} min
            </Chip>
            <Chip tone="outline">
              <Icon name="server" size={12} />
              IP 10.20.4.18
            </Chip>
          </div>
          <p className="adm-session__note">
            <Icon name="info" size={13} />
            Consola de gobierno de demostración. La sesión de trabajo de {demoActor.displayName}{' '}
            conserva el rol {roleLabels[demoActor.role]} y no cambia con estas acciones.
          </p>
        </section>

        <section className="kpi-grid" aria-label="Indicadores de administración">
          <article className="kpi" data-accent="indigo">
            <div className="kpi__top">
              <h3 className="kpi__label">Cuentas activas</h3>
              <span className="kpi__icon">
                <Icon name="users" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">
                {metrics.active}
                <small> / {metrics.total}</small>
              </p>
            </div>
            <div className="kpi__foot">
              <span>{metrics.total - metrics.active} sin acceso vigente</span>
            </div>
          </article>

          <article className="kpi" data-accent="emerald">
            <div className="kpi__top">
              <h3 className="kpi__label">Cobertura MFA</h3>
              <span className="kpi__icon">
                <Icon name="lock" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">
                {percentage(metrics.mfa, metrics.active)}
                <small> %</small>
              </p>
            </div>
            <div className="kpi__foot">
              <span>
                {metrics.mfa} de {metrics.active} cuentas activas
              </span>
            </div>
          </article>

          <article className="kpi" data-accent="amber">
            <div className="kpi__top">
              <h3 className="kpi__label">Eventos auditados</h3>
              <span className="kpi__icon">
                <Icon name="fileText" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{snapshot.audit.length}</p>
            </div>
            <div className="kpi__foot">
              <span>
                {metrics.critical} críticos · {metrics.warnings} advertencias
              </span>
            </div>
          </article>

          <article className="kpi" data-accent="violet">
            <div className="kpi__top">
              <h3 className="kpi__label">Cupo GPU en uso</h3>
              <span className="kpi__icon">
                <Icon name="server" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">
                {metrics.gpu.used}
                <small> / {metrics.gpu.limit}</small>
              </p>
            </div>
            <div className="kpi__foot">
              <span>{percentage(metrics.gpu.used, metrics.gpu.limit)} % de la capacidad</span>
            </div>
          </article>
        </section>

        <UsersPanel
          users={snapshot.users}
          currentUserId={consoleAdmin.id}
          onRoleChange={handleRoleChange}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      {openDialog === 'matrix' ? (
        <AdminModal
          title="Matriz de permisos (RBAC)"
          lede="Política vigente por rol global. Los permisos de proyecto siguen dependiendo de la pertenencia al proyecto."
          size="xl"
          onClose={() => setOpenDialog(null)}
        >
          <PermissionMatrix />
        </AdminModal>
      ) : null}

      {openDialog === 'health' ? (
        <AdminModal
          title="Salud del sistema"
          lede="Sondas de plataforma, latencias y estado de la cola de trabajo."
          size="lg"
          onClose={() => setOpenDialog(null)}
        >
          <HealthPanel
            services={seedHealth}
            checkedAt={checkedAt}
            onRefresh={handleRefreshHealth}
          />
        </AdminModal>
      ) : null}

      {openDialog === 'audit' ? (
        <AdminModal
          title="Auditoría de acciones"
          lede="Trazabilidad de accesos, permisos, recursos, datasets, entrenamientos, modelos y exportaciones."
          size="xl"
          onClose={() => setOpenDialog(null)}
        >
          <AuditPanel
            events={snapshot.audit}
            retentionDays={snapshot.settings.auditRetentionDays}
            onExport={handleExportAudit}
          />
        </AdminModal>
      ) : null}

      {openDialog === 'limits' ? (
        <AdminModal
          title="Límites de recursos"
          lede="Cuotas vigentes para la cola, los workers y el almacenamiento. Se aplican al siguiente ciclo de planificación."
          size="xl"
          onClose={() => setOpenDialog(null)}
        >
          <LimitsPanel limits={snapshot.limits} onApply={handleApplyLimit} />
        </AdminModal>
      ) : null}

      {openDialog === 'policy' ? (
        <AdminModal
          title="Políticas de seguridad"
          lede="Sesión, autenticación multifactor y plazos de conservación. Los cambios rigen para todas las cuentas."
          size="lg"
          onClose={() => setOpenDialog(null)}
        >
          <PolicyPanel settings={snapshot.settings} onSave={handleSaveSettings} />
        </AdminModal>
      ) : null}

      {inviteOpen ? (
        <InviteDialog
          existingEmails={snapshot.users.map((user) => user.email)}
          onClose={() => setInviteOpen(false)}
          onSubmit={handleInvite}
        />
      ) : null}
    </>
  );
}
