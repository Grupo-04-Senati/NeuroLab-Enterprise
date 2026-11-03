import { useEffect, useRef, useState } from 'react';
import type { DatasetRecord } from '@/types/dataset';
import { Icon } from '@/components/ui/Icon';
import { formatBytes } from '@/features/datasets/model';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

interface DeleteDatasetDialogProps {
  dataset: DatasetRecord;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDatasetDialog({ dataset, onClose, onConfirm }: DeleteDatasetDialogProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const confirmed = typed.trim() === dataset.name;

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
        aria-labelledby="ds-delete-title"
        aria-describedby="ds-delete-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M05 · Eliminación segura</p>
            <h2 id="ds-delete-title">Eliminar {dataset.name}</h2>
            <p id="ds-delete-desc" className="ds-modal__lede">
              Se eliminarán {dataset.versions.length}{' '}
              {dataset.versions.length === 1 ? 'versión' : 'versiones'} y {formatBytes(dataset.sizeBytes)} de
              almacenamiento de objetos. La purga física ocurre en 30 días y el evento queda en auditoría.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="ds-modal__body">
          <div className="ds-warning">
            <Icon name="alertTriangle" size={18} />
            <p>
              Si el dataset está siendo usado por un entrenamiento activo, la eliminación se rechaza en el
              backend. Esta acción no se puede deshacer desde la interfaz.
            </p>
          </div>

          <div className="ds-field">
            <label htmlFor="ds-delete-confirm">
              Escribe <strong>{dataset.name}</strong> para confirmar
            </label>
            <input
              id="ds-delete-confirm"
              ref={inputRef}
              className="ds-input"
              type="text"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              placeholder={dataset.name}
            />
          </div>
        </div>

        <footer className="ds-modal__foot">
          <span className="ds-modal__foot-note u-mono">{dataset.id}</span>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary ds-btn-danger"
            disabled={!confirmed}
            onClick={onConfirm}
          >
            <Icon name="alertTriangle" size={16} />
            Eliminar dataset
          </button>
        </footer>
      </div>
    </div>
  );
}
