import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { directoryUsers } from '@/lib/mock/projects';
import { roleLabels } from '@/lib/nav';
import { formatNumber } from '@/lib/format';
import {
  CAPABILITY_RULES,
  RANGE_PRESETS,
  REPORT_SECTIONS,
  canReport,
} from '@/features/reports/model';
import type { ReportFormat, ReportSectionMeta } from '@/features/reports/model';
import type { ReportModel } from '@/features/reports/useReportData';

/* §6 M09 · el compositor reúne las cuatro piezas del pdf: ficha, arquitectura, historial y
   exportación. Todo lo que se elige aquí afecta a la pantalla, al CSV y al PDF por igual. */

export function ReportComposer({
  report,
  onExport,
}: {
  report: ReportModel;
  onExport: (format: ReportFormat) => void;
}) {
  const { document, access, previewing } = report;
  const rows = document
    ? document.sections.reduce((sum, section) => sum + section.rows, 0)
    : 0;

  return (
    <div className="rp-compose">
      <Panel
        title="Composición del informe"
        subtitle="Elija el proyecto, el periodo y las secciones que se incluyen."
        icon="report"
        footer={
          <>
            <span>
              {document
                ? `${document.sections.length} sección(es) · ${formatNumber(rows)} fila(s) de datos`
                : 'Sin proyecto seleccionado.'}
            </span>
            {document && document.masked.length > 0 ? (
              <span className="rp-compose__masked">
                <Icon name="lock" size={12} />
                {formatNumber(document.masked.length)} campo(s) restringido(s)
              </span>
            ) : null}
          </>
        }
      >
        <div className="rp-field">
          <label htmlFor="rp-project">Proyecto</label>
          {report.accessible.length === 0 ? (
            <p className="rp-field__hint" role="status">
              <Icon name="lock" size={12} />
              Su sesión no figura en ningún proyecto de la cartera. Solicite acceso en M10 para generar
              informes.
            </p>
          ) : (
            <>
              <select
                id="rp-project"
                className="rp-input"
                value={report.projectId}
                onChange={(event) => report.selectProject(event.target.value)}
              >
                {report.accessible.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.name}
                  </option>
                ))}
              </select>
              <p className="rp-field__hint">
                Rol en el proyecto seleccionado:&nbsp;
                <strong>{access?.projectRoleLabel ?? '—'}</strong> · ejecuciones en el alcance:{' '}
                {formatNumber(
                  report.accessible.find((item) => item.id === report.projectId)?.runs ?? 0,
                )}
              </p>
            </>
          )}
        </div>

        <div className="rp-field">
          <span className="rp-field__label" id="rp-scope-label">
            Periodo del historial
          </span>
          <div className="filters" role="group" aria-labelledby="rp-scope-label">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="filter-btn"
                aria-pressed={report.scope.preset === preset.id}
                onClick={() => report.setScope({ preset: preset.id })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {report.scope.preset === 'CUSTOM' ? (
            <div className="rp-dates">
              <label>
                <span>Desde</span>
                <input
                  type="date"
                  className="rp-input"
                  value={report.scope.from}
                  onChange={(event) => report.setScope({ from: event.target.value })}
                />
              </label>
              <label>
                <span>Hasta</span>
                <input
                  type="date"
                  className="rp-input"
                  value={report.scope.to}
                  onChange={(event) => report.setScope({ to: event.target.value })}
                />
              </label>
            </div>
          ) : null}
          {document ? (
            <p className="rp-field__hint">
              {document.scopeLabel}
              {document.totals.outsideScope > 0
                ? ` · ${formatNumber(document.totals.outsideScope)} ejecución(es) del proyecto quedaron fuera del periodo.`
                : ''}
            </p>
          ) : null}
        </div>

        <div className="rp-field">
          <span className="rp-field__label">Secciones</span>
          <div className="rp-sections__tools">
            <button type="button" className="btn btn--ghost btn--sm" onClick={report.selectAllSections}>
              <Icon name="checkCircle" size={13} />
              Incluir todas
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={report.clearSections}>
              <Icon name="minus" size={13} />
              Ninguna
            </button>
          </div>
          <ul className="rp-sections">
            {REPORT_SECTIONS.map((section) => (
              <SectionToggle
                key={section.id}
                section={section}
                checked={report.selected.includes(section.id)}
                locked={!access || !canReport(access, section.requires)}
                onToggle={() => report.toggleSection(section.id)}
              />
            ))}
          </ul>
        </div>

        <div className="rp-field">
          <label htmlFor="rp-role">Vista previa de permisos</label>
          <select
            id="rp-role"
            className="rp-input"
            value={report.previewUserId}
            onChange={(event) => report.setPreviewUser(event.target.value)}
          >
            <option value="self">
              Sesión real · {report.actor.displayName} ({roleLabels[report.actor.role]})
            </option>
            {directoryUsers
              .filter((user) => user.id !== report.actor.id)
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} · {roleLabels[user.role]}
                </option>
              ))}
          </select>
          <p className="rp-field__hint" data-tone={previewing ? 'warn' : undefined}>
            <Icon name={previewing ? 'users' : 'info'} size={12} />
            {previewing
              ? 'Simulación: la máscara cambia en pantalla y la exportación queda bloqueada hasta volver a la sesión real.'
              : 'El informe usa siempre los permisos de la sesión; esta lista sólo permite revisar qué vería otro rol.'}
          </p>
        </div>
      </Panel>

      <Panel
        title="Exportación según permisos"
        subtitle={`Capacidades de ${report.sessionAccess?.projectRoleLabel ?? 'la sesión'} sobre este proyecto.`}
        icon="download"
        className="rp-export"
        footer={
          <>
            <span>§11: cada descarga deja registro con actor, formato, secciones y huella.</span>
            <a href="/admin">Matriz completa en M10</a>
          </>
        }
      >
        <ul className="rp-caps">
          {CAPABILITY_RULES.filter((rule) => rule.id === 'exportar-csv' || rule.id === 'exportar-pdf').map(
            (rule) => {
              const allowed = access !== null && canReport(access, rule.id);
              const format = rule.id === 'exportar-csv' ? 'CSV' : 'PDF';
              const live = report.canExport(format);
              return (
                <li key={rule.id} className="rp-cap" data-ok={allowed || undefined}>
                  <span className="rp-cap__icon">
                    <Icon name={allowed ? 'checkCircle' : 'lock'} size={16} />
                  </span>
                  <span className="rp-cap__text">
                    <strong>{rule.label}</strong>
                    <small>{rule.hint}</small>
                  </span>
                  <span className="rp-cap__state">
                    {allowed ? (live ? 'Disponible' : 'Bloqueado en simulación') : 'Restringido'}
                  </span>
                </li>
              );
            },
          )}
        </ul>

        <div className="rp-export__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => onExport('CSV')}
            disabled={!document || document.sections.length === 0}
          >
            <Icon name="download" size={16} />
            Descargar CSV
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onExport('PDF')}
            disabled={!document || document.sections.length === 0}
          >
            <Icon name="fileText" size={16} />
            Generar PDF
          </button>
        </div>
        <p className="rp-export__note">
          <Icon name="info" size={12} />
          El botón abre la confirmación con el resumen de filas y campos restringidos; el archivo se
          registra en la bitácora al generarse.
        </p>
      </Panel>
    </div>
  );
}

function SectionToggle({
  section,
  checked,
  locked,
  onToggle,
}: {
  section: ReportSectionMeta;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rp-sections__item">
      <label className="rp-check" data-off={!checked || undefined} data-locked={locked || undefined}>
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={onToggle}
        />
        <span className="rp-check__icon">
          <Icon name={section.icon} size={15} />
        </span>
        <span className="rp-check__text">
          <strong>{section.label}</strong>
          <small>{section.description}</small>
        </span>
        <span className="rp-check__module u-caps">{section.module}</span>
      </label>
    </li>
  );
}
