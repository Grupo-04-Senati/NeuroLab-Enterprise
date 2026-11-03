import { useMemo } from 'react';
import type { ReportDocument, ReportFormat } from '@/features/reports/model';
import { csvSummary, fingerprint, reportFileName, toCsv } from '@/features/reports/model';
import { Icon } from '@/components/ui/Icon';
import { formatBytes } from '@/features/datasets/model';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

/* §11 · antes de distribuir se muestra qué se distribuye: secciones, filas, campos restringidos y
   huella del contenido. Confirmar deja el asiento en la bitácora de exportaciones. */

interface ExportDialogProps {
  document: ReportDocument;
  format: ReportFormat;
  allowed: boolean;
  denial: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportDialog({
  document,
  format,
  allowed,
  denial,
  onClose,
  onConfirm,
}: ExportDialogProps) {
  const panelRef = useDialogFocusTrap(onClose);
  const summary = useMemo(() => csvSummary(document), [document]);
  const fileName = reportFileName(document, format, Date.now());

  /* La huella se calcula sobre el mismo texto que se descargaría, no sobre un resumen. */
  const preview = useMemo(() => {
    if (format !== 'CSV') return null;
    const csv = toCsv(document);
    return {
      hash: fingerprint(csv),
      bytes: new TextEncoder().encode(csv).length,
    };
  }, [document, format]);

  return (
    <div
      className="rp-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="rp-modal__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rp-export-title"
        aria-describedby="rp-export-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="rp-modal__head">
          <div>
            <p className="rp-modal__eyebrow">M09 · Confirmación de exportación</p>
            <h2 id="rp-export-title">Generar {format}</h2>
            <p id="rp-export-desc" className="rp-modal__lede">
              {document.project.id} · {document.project.name} — {document.scopeLabel}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="rp-modal__body">
          <ul className="rp-modal__summary">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {document.masked.length > 0 ? (
            <div className="rp-warning">
              <Icon name="lock" size={18} />
              <p>
                El archivo se emite con los permisos de {document.actor.name} (
                {document.actor.projectRoleLabel}). {document.masked.length} campo(s) saldrán como
                «restringido por rol»: {document.masked.join(', ')}.
              </p>
            </div>
          ) : (
            <p className="rp-modal__ok">
              <Icon name="checkCircle" size={16} />
              Ningún campo queda restringido para su rol: el archivo replica la pantalla.
            </p>
          )}

          <dl className="rp-modal__file">
            <div>
              <dt>Nombre sugerido</dt>
              <dd className="u-mono">{fileName}</dd>
            </div>
            {preview ? (
              <>
                <div>
                  <dt>Tamaño del archivo</dt>
                  <dd>{formatBytes(preview.bytes)}</dd>
                </div>
                <div>
                  <dt>Huella del contenido</dt>
                  <dd className="u-mono">{preview.hash.slice(0, 16)}…</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Tamaño del archivo</dt>
                <dd>Lo define el diálogo de impresión del navegador.</dd>
              </div>
            )}
            <div>
              <dt>Bitácora</dt>
              <dd>
                La exportación es obligatoriamente trazable: se registra con actor, formato, secciones y
                huella (§11).
              </dd>
            </div>
          </dl>

          {format === 'PDF' ? (
            <p className="rp-modal__print">
              <Icon name="info" size={14} />
              El PDF se genera con el diálogo del navegador: elija «Guardar como PDF», tamaño A4 y conserve
              el nombre sugerido. Las notas y márgenes del sistema se ocultan en la impresión.
            </p>
          ) : null}

          {!allowed ? (
            <p className="rp-modal__denied" role="alert">
              <Icon name="alertTriangle" size={16} />
              {denial}
            </p>
          ) : null}
        </div>

        <footer className="rp-modal__foot">
          <span className="u-mono">{document.generatedAt}</span>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!allowed}
            onClick={onConfirm}
          >
            <Icon name={format === 'CSV' ? 'download' : 'fileText'} size={16} />
            {allowed ? `Exportar ${format}` : 'Sin permiso de exportación'}
          </button>
        </footer>
      </div>
    </div>
  );
}
