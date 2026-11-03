import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

interface AdminModalProps {
  title: string;
  lede?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function AdminModal({
  title,
  lede,
  size = 'lg',
  footer,
  onClose,
  children,
}: AdminModalProps) {
  const panelRef = useDialogFocusTrap(onClose);
  const titleId = `adm-modal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => {
    panelRef.current?.focus();
  }, [panelRef]);

  return (
    <div
      className="adm-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`adm-modal__panel adm-modal__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="adm-modal__head">
          <div>
            <p className="adm-modal__eyebrow">M10 · Administración y seguridad</p>
            <h2 id={titleId}>{title}</h2>
            {lede ? <p className="adm-modal__lede">{lede}</p> : null}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="adm-modal__body">{children}</div>

        {footer ? <footer className="adm-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
