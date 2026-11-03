import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmación para acciones que modifican el acceso o la documentación. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="ds-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel ds-modal__panel--sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pj-confirm-title"
        aria-describedby="pj-confirm-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M02 · Confirmación</p>
            <h2 id="pj-confirm-title">{title}</h2>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="ds-modal__body">
          <div className="ds-warning">
            <Icon name="alertTriangle" size={18} />
            <p id="pj-confirm-desc">{description}</p>
          </div>
        </div>

        <footer className="ds-modal__foot">
          <span className="ds-modal__foot-note">La acción queda registrada en auditoría.</span>
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary ds-btn-danger" onClick={onConfirm}>
            <Icon name="trash" size={16} />
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
