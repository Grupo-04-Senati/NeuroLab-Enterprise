import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { dataSource } from '@/lib/api/dashboard';
import { formatRelativeTime } from '@/lib/format';
import { ReportComposer } from '@/features/reports/ReportComposer';
import { ReportSheet } from '@/features/reports/ReportDocument';
import { ExportDialog } from '@/features/reports/ExportDialog';
import { ExportLedger, PermissionsMatrix } from '@/features/reports/ReportAudit';
import { useReportData } from '@/features/reports/useReportData';
import type { ReportFormat } from '@/features/reports/model';

/* M09 · Reportes. §6 del documento maestro pide cuatro cosas —ficha de proyecto, resumen de
   arquitectura, historial de entrenamiento y exportación CSV/PDF según permisos— y todas se
   construyen sobre el mismo documento: la pantalla, el CSV y el PDF comparten una sola fuente. */

export function ReportsPage() {
  const report = useReportData();
  const [dialog, setDialog] = useState<ReportFormat | null>(null);

  const document = report.document;
  const totals = document?.totals ?? null;
  const noProjects = report.accessible.length === 0;

  return (
    <div className="dash rp">
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="report" size={14} strokeWidth={2} />
            M09 · Reportes
          </p>
          <h1 className="page-head__title">Informe de proyecto, arquitectura e historial</h1>
          <p className="page-head__lede">
            Reúne la ficha del proyecto (M02), el resumen de arquitectura (M04) y el historial de
            entrenamiento (M06) en un documento único. La exportación a CSV o PDF respeta los permisos
            del rol y queda registrada en la bitácora; la consola no recalcula ninguna métrica (RN-03).
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={report.refresh}>
            <Icon name="refresh" size={16} />
            Actualizar datos
          </button>
          <a className="btn btn--primary" href="/training">
            <Icon name="training" size={16} />
            Ver entrenamientos
          </a>
        </div>
      </div>

      <div className="rp-strip">
        <div className="status-grid">
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="projects" size={15} />
              Proyectos informables
            </span>
            <span className="status-line__val">{report.accessible.length}</span>
          </div>
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="training" size={15} />
              Ejecuciones en el alcance
            </span>
            <span className="status-line__val">{totals ? totals.runs : 0}</span>
          </div>
          <div className="status-line" data-tone={totals && totals.failed > 0 ? 'bad' : undefined}>
            <span className="status-line__key">
              <Icon name="alertTriangle" size={15} />
              Avisos del informe
            </span>
            <span className="status-line__val">{totals ? totals.warnings : 0}</span>
          </div>
          <div className="status-line" data-tone={document && document.masked.length > 0 ? 'warn' : undefined}>
            <span className="status-line__key">
              <Icon name="lock" size={15} />
              Campos restringidos
            </span>
            <span className="status-line__val">{document ? document.masked.length : 0}</span>
          </div>
          <div className="status-line">
            <span className="status-line__key">
              <Icon name="clock" size={15} />
              Origen de los datos
            </span>
            <span className="status-line__val">
              {dataSource === 'demo' ? 'Demostración' : 'API'} ·{' '}
              {report.lastUpdated ? formatRelativeTime(report.lastUpdated) : 'pendiente'}
            </span>
          </div>
        </div>

        {report.error ? (
          <div className="callout" role="alert">
            <Icon name="alertTriangle" size={18} />
            <div>
              <p>
                <strong>La plataforma respondió con un error al leer el estado de los entrenamientos.</strong>{' '}
                {report.error} El informe se muestra con los datos en caché; reintentar la sincronización
                actualiza el historial.
              </p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={report.refresh}>
                <Icon name="refresh" size={14} />
                Sincronizar de nuevo
              </button>
            </div>
          </div>
        ) : null}

        {report.previewing ? (
          <div className="callout rp-callout--warn" role="status">
            <Icon name="users" size={18} />
            <div>
              <p>
                <strong>Está simulando el rol de otra persona.</strong> La vista previa cambia la máscara en
                pantalla para que compruebe qué vería ese usuario, pero bloquea la exportación: ningún
                archivo se genera con permisos ajenos a la sesión (§11).
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => report.setPreviewUser('self')}
              >
                <Icon name="close" size={14} />
                Volver a la sesión real
              </button>
            </div>
          </div>
        ) : null}

        {report.notice ? (
          <div className="tr-notice" data-tone={report.notice.tone} role="status">
            <Icon
              name={report.notice.ok ? (report.notice.tone === 'info' ? 'clock' : 'checkCircle') : 'alertTriangle'}
              size={16}
            />
            <p>{report.notice.text}</p>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={report.dismissNotice}
              aria-label="Descartar aviso"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : null}
      </div>

      {noProjects ? (
        <div className="dash__main">
          <div className="dash__col">
            <Panel title="Sin proyectos autorizados" icon="lock" subtitle="M09 informa proyectos, no la plataforma completa.">
              <p className="panel__note">
                Su sesión ({report.actor.displayName}) no figura como integrante de ningún proyecto de la
                cartera. El informe exigiría lectura horizontal, así que la consola lo cierra: solicite el
                alta en M02 o revise la gestión de accesos en M10.
              </p>
              <a className="btn btn--primary" href="/admin" style={{ marginTop: 'var(--sp-4)' }}>
                <Icon name="shield" size={16} />
                Ir a administración
              </a>
            </Panel>
          </div>
        </div>
      ) : (
        <div className="dash__main rp__main">
          <div className="dash__col">
            {report.status === 'loading' && !document ? (
              <div className="panel">
                <div className="panel__body">
                  <div className="skeleton" style={{ height: 460 }} />
                </div>
              </div>
            ) : report.problem ? (
              <Panel
                title="Informe no disponible para este proyecto"
                icon="lock"
                subtitle={report.project ? `${report.project.id} · ${report.project.name}` : undefined}
              >
                <div className="rp-denied">
                  <Icon name="shield" size={20} />
                  <p>{report.problem}</p>
                  <p className="panel__note">
                    El intento de lectura de un proyecto ajeno se registra en la auditoría de M10; la
                    consola no revela si el proyecto existe ni cuántos entrenamientos tiene.
                  </p>
                </div>
              </Panel>
            ) : report.selected.length === 0 ? (
              <Panel title="Nada que mostrar" icon="report" subtitle="Active al menos una sección en el compositor.">
                <p className="empty">
                  <Icon name="report" size={16} />
                  El informe se compone de fichas seleccionables: elija qué incluye el CSV y el PDF.
                </p>
              </Panel>
            ) : (
              <div className="rp-sheet">
                <div className="rp-sheet__bar">
                  <span className="rp-sheet__label u-caps">
                    <Icon name="fileText" size={13} />
                    Documento del informe
                  </span>
                  {report.curvesLoading ? (
                    <span className="rp-sheet__loading">
                      <Icon name="clock" size={12} />
                      Cargando curva de la mejor ejecución…
                    </span>
                  ) : null}
                  <span className="rp-sheet__pages u-num">
                    {document ? document.sections.length : 0} sección(es)
                  </span>
                </div>
                {document ? <ReportSheet document={document} /> : null}
              </div>
            )}
          </div>

          <div className="dash__col rp__side">
            {report.access ? (
              <ReportComposer report={report} onExport={setDialog} />
            ) : null}
            {report.sessionAccess ? (
              <PermissionsMatrix
                actor={report.actor}
                project={report.project}
                access={report.sessionAccess}
              />
            ) : null}
          </div>
        </div>
      )}

      <ExportLedger
        events={report.events}
        project={report.project}
        actor={report.actor}
        highlight={report.lastEvent?.id ?? null}
      />

      {dialog && document ? (
        <ExportDialog
          document={document}
          format={dialog}
          allowed={report.canExport(dialog)}
          denial={
            report.previewing
              ? 'Está simulando otro rol: vuelva a la sesión real para exportar.'
              : 'Su rol en este proyecto permite consultar el informe, pero no distribuirlo (§11).'
          }
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const outcome = dialog === 'CSV' ? report.exportCsv() : report.exportPdf();
            report.notify(outcome);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
