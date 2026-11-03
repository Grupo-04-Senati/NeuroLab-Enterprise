import { useEffect, useRef, useState } from 'react';
import type { TrainingJob } from '@/types/domain';
import { Icon } from '@/components/ui/Icon';
import { statusMeta } from '@/lib/nav';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

/* RN-05 · la cancelación es una solicitud y exige motivo: queda en auditoría y en el
   registro del trabajo. El worker confirma el estado final al cerrar la época. */

const REASONS = [
  'Configuración incorrecta: lote o épocas a revisar',
  'Curva divergente: la pérdida dejó de mejorar',
  'Dataset desactualizado, se reprocesará en M05',
  'Liberar worker para un experimento crítico',
];

interface CancelDialogProps {
  job: TrainingJob;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function CancelDialog({ job, onClose, onConfirm }: CancelDialogProps) {
  const [motivo, setMotivo] = useState(REASONS[0]);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);
  const valid = motivo.trim().length >= 12;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className="tr-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="tr-modal__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tr-cancel-title"
        aria-describedby="tr-cancel-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tr-modal__head">
          <div>
            <p className="tr-modal__eyebrow">M06 · Solicitud de cancelación</p>
            <h2 id="tr-cancel-title">Cancelar {job.id}</h2>
            <p id="tr-cancel-desc" className="tr-modal__lede">
              {job.project} · {job.architectureName}. Estado actual {statusMeta[job.status].label.toLowerCase()};
              avance {job.epoch}/{job.epochs} épocas.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="tr-modal__body">
          <div className="tr-warning">
            <Icon name="alertTriangle" size={18} />
            <p>
              No es un borrado: se detiene el ciclo y el worker conserva los logs técnicos y la última época
              completa. El trabajo queda en estado <strong>Cancelado</strong> y puede reintentarse (RN-05).
            </p>
          </div>

          <div className="tr-field">
            <label htmlFor="tr-cancel-motivo">
              Motivo <strong>obligatorio</strong>
            </label>
            <textarea
              id="tr-cancel-motivo"
              ref={inputRef}
              className="tr-input tr-input--area"
              rows={3}
              value={motivo}
              aria-invalid={touched && !valid}
              onChange={(event) => {
                setMotivo(event.target.value);
                setTouched(true);
              }}
              placeholder="Describa por qué se interrumpe la ejecución"
            />
            {touched && !valid ? (
              <p className="tr-field__msg" data-tone="error">
                <Icon name="alertCircle" size={12} />
                El motivo se registra en auditoría: escriba al menos 12 caracteres.
              </p>
            ) : (
              <p className="tr-field__hint">Se publica en la bitácora del trabajo y en el registro de M10.</p>
            )}
          </div>

          <div className="tr-reasons">
            {REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setMotivo(reason);
                  setTouched(true);
                }}
              >
                <Icon name="plus" size={12} />
                {reason}
              </button>
            ))}
          </div>
        </div>

        <footer className="tr-modal__foot">
          <span className="tr-modal__foot-note u-mono">{job.projectId}</span>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn--primary tr-btn-danger"
            disabled={!valid}
            onClick={() => onConfirm(motivo.trim())}
          >
            <Icon name="close" size={16} />
            Solicitar cancelación
          </button>
        </footer>
      </div>
    </div>
  );
}
