import type { ExportEvent, ReportAccess } from '@/features/reports/model';
import { CAPABILITY_RULES, canReport, resolveAccess, SECTION_BY_ID } from '@/features/reports/model';
import type { ProjectRecord } from '@/types/project';
import type { Actor } from '@/types/domain';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { formatBytes } from '@/features/datasets/model';
import { memberRoleMeta } from '@/features/projects/model';
import { formatDateTime, formatNumber } from '@/lib/format';

/* §11 · la matriz es la regla que aplica el modelo de informe, no una explicación aparte; la bitácora
   muestra las descargas reales de esta consola con su huella. */

const MATRIX_ROLES = ['owner', 'engineer', 'reviewer', 'reader'] as const;

export function PermissionsMatrix({
  actor,
  project,
  access,
}: {
  actor: Actor;
  project: ProjectRecord | null;
  access: ReportAccess;
}) {
  return (
    <Panel
      title="Matriz de capacidades del informe"
      subtitle={
        project
          ? `Aplicada sobre ${project.id} · ${project.name}.`
          : 'Seleccione un proyecto para ver el efecto concreto de su rol.'
      }
      icon="shield"
      body="tight"
      footer={
        <>
          <span>Administración global: todas las capacidades, sin máscaras.</span>
          <a href="/projects">Gestionar integrantes en M02</a>
        </>
      }
    >
      <div className="table-wrap">
        <table className="table rp-matrix">
          <caption className="u-sr-only">
            Capacidades de reporte por rol de proyecto y estado de la sesión
          </caption>
          <thead>
            <tr>
              <th scope="col">Capacidad</th>
              {MATRIX_ROLES.map((role) => (
                <th key={role} scope="col" className="is-center">
                  {memberRoleMeta[role].short}
                </th>
              ))}
              <th scope="col" className="is-right">
                Su sesión
              </th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_RULES.map((rule) => {
              const mine = canReport(access, rule.id);
              return (
                <tr key={rule.id}>
                  <td data-label="Capacidad" data-col="name">
                    <span className="table__name">{rule.label}</span>
                    <span className="table__sub">{rule.hint}</span>
                  </td>
                  {MATRIX_ROLES.map((role) => {
                    const allowed = rule.roles.includes(role);
                    return (
                      <td key={role} data-label={memberRoleMeta[role].short} className="is-center">
                        <Icon
                          name={allowed ? 'checkCircle' : 'minus'}
                          size={14}
                          style={{ color: allowed ? 'var(--success)' : 'var(--c-slate-300)' }}
                          title={allowed ? `${memberRoleMeta[role].short} puede ${rule.label.toLowerCase()}` : 'No incluida'}
                        />
                        <span className="u-sr-only">
                          {allowed ? 'Permitido' : 'Restringido'} para {memberRoleMeta[role].label}
                        </span>
                      </td>
                    );
                  })}
                  <td data-label="Su sesión" className="is-right">
                    <span className="rp-allow" data-ok={mine || undefined}>
                      <Icon name={mine ? 'checkCircle' : 'lock'} size={13} />
                      {mine ? 'Habilitado' : 'Restringido'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="rp-matrix__foot">
        <Icon name="info" size={12} />
        Sesión de {actor.displayName} como {access.projectRoleLabel}
        {actor.role === 'admin' ? ' con administración global' : ''}. La columna «Su sesión» reproduce
        exactamente la máscara que vería en el informe: no es un texto aparte.
      </p>
    </Panel>
  );
}

export function ExportLedger({
  events,
  project,
  actor,
  highlight,
}: {
  events: ExportEvent[];
  project: ProjectRecord | null;
  actor: Actor;
  highlight: string | null;
}) {
  const scoped = project ? events.filter((event) => event.projectId === project.id) : [];
  const technical = project ? canReport(resolveAccess(actor, project), 'ver-tecnico') : false;

  return (
    <Panel
      title="Bitácora de exportaciones del proyecto"
      subtitle="Quién descargó el informe, qué incluyó y con qué huella; metadatos, nunca contenido del dataset (§11)."
      icon="archive"
      body="tight"
      className="rp-noprint"
      footer={
        <>
          <span>Se conservan los últimos 40 asientos de esta consola.</span>
          <a href="/admin">Auditoría completa en M10</a>
        </>
      }
    >
      {scoped.length === 0 ? (
        <p className="empty">
          <Icon name="archive" size={16} />
          Todavía no hay descargas registradas para {project ? project.id : 'este proyecto'}.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table rp-ledger">
            <caption className="u-sr-only">Exportaciones registradas en la consola</caption>
            <thead>
              <tr>
                <th scope="col">Asiento</th>
                <th scope="col">Fecha</th>
                <th scope="col">Actor</th>
                <th scope="col">Formato</th>
                <th scope="col">Secciones</th>
                <th scope="col" className="is-right">
                  Filas
                </th>
                <th scope="col" className="is-right">
                  Tamaño
                </th>
                <th scope="col">Huella</th>
                <th scope="col">Restringidos</th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((event) => (
                <tr key={event.id} data-current={event.id === highlight || undefined}>
                  <td data-label="Asiento" data-col="name">
                    <span className="table__name u-mono">{event.id}</span>
                    <span className="table__sub">{event.scopeLabel}</span>
                  </td>
                  <td data-label="Fecha">{formatDateTime(event.at)}</td>
                  <td data-label="Actor">
                    <span className="table__name">{event.actor.name}</span>
                    <span className="table__sub">{event.actor.projectRoleLabel}</span>
                  </td>
                  <td data-label="Formato">
                    <Chip tone={event.format === 'CSV' ? 'completed' : 'running'}>
                      {event.format}
                    </Chip>
                  </td>
                  <td data-label="Secciones">
                    <span className="rp-ledger__sections">
                      {event.sections.map((id) => SECTION_BY_ID.get(id)?.label ?? id).join(' · ')}
                    </span>
                  </td>
                  <td data-label="Filas" className="is-right u-num">
                    {formatNumber(event.rows)}
                  </td>
                  <td data-label="Tamaño" className="is-right u-num">
                    {event.bytes > 0 ? formatBytes(event.bytes) : 'no medido'}
                  </td>
                  <td data-label="Huella" className="u-mono">
                    {technical ? event.fingerprint.slice(0, 12) : `${event.fingerprint.slice(0, 6)}…`}
                  </td>
                  <td data-label="Restringidos">
                    {event.masked.length === 0 ? (
                      <span className="rp-ledger__none">ninguno</span>
                    ) : (
                      <span title={event.masked.join(', ')}>
                        {formatNumber(event.masked.length)} campo(s)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
