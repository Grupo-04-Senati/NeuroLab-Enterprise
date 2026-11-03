import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ProjectDocument } from '@/types/project';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

interface DocEditorDialogProps {
  mode: 'create' | 'edit';
  document?: ProjectDocument;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
}

export function DocEditorDialog({ mode, document, onClose, onSubmit }: DocEditorDialogProps) {
  const [title, setTitle] = useState(document?.title ?? '');
  const [body, setBody] = useState(document?.body ?? '');
  const [attempted, setAttempted] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const titleError =
    title.trim().length < 4
      ? 'El título debe tener al menos 4 caracteres.'
      : title.trim().length > 100
        ? 'El título no puede superar 100 caracteres.'
        : null;
  const bodyError =
    body.trim().length < 20
      ? 'Añade al menos 20 caracteres de contexto.'
      : body.trim().length > 2000
        ? 'La documentación no puede superar 2000 caracteres.'
        : null;
  const valid = !titleError && !bodyError;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!valid) {
      if (titleError) titleRef.current?.focus();
      return;
    }
    onSubmit(title.trim(), body.trim());
  };

  return (
    <div
      className="ds-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pj-doc-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M02 · Documentación</p>
            <h2 id="pj-doc-title">
              {mode === 'create' ? 'Nueva documentación' : 'Editar documentación'}
            </h2>
            <p className="ds-modal__lede">
              Conserva decisiones, supuestos y restricciones del proyecto. El contenido queda visible para
              todos los miembros con acceso.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <form className="ds-form" onSubmit={handleSubmit} noValidate>
          <div className="ds-modal__body">
            {attempted && !valid ? (
              <p className="ds-form__error" role="alert">
                Revisa los campos marcados antes de continuar.
              </p>
            ) : null}

            <div className="ds-field">
              <label htmlFor="pj-doc-name">Título</label>
              <input
                id="pj-doc-name"
                ref={titleRef}
                className="ds-input"
                type="text"
                value={title}
                maxLength={100}
                aria-invalid={Boolean(titleError && (attempted || titleTouched))}
                onBlur={() => setTitleTouched(true)}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="p. ej. Criterios de éxito"
              />
              {titleError && (attempted || titleTouched) ? (
                <span className="ds-field__error">{titleError}</span>
              ) : null}
            </div>

            <div className="ds-field">
              <label htmlFor="pj-doc-body">Contenido</label>
              <textarea
                id="pj-doc-body"
                className="ds-input ds-input--area pj-doc-textarea"
                rows={9}
                value={body}
                maxLength={2000}
                aria-invalid={Boolean(bodyError && (attempted || bodyTouched))}
                onBlur={() => setBodyTouched(true)}
                onChange={(event) => setBody(event.target.value)}
                placeholder={'Contexto, decisiones y restricciones.\n\nSepara los párrafos con una línea en blanco.'}
              />
              <div className="pj-field-foot">
                {bodyError && (attempted || bodyTouched) ? (
                  <span className="ds-field__error">{bodyError}</span>
                ) : (
                  <span className="ds-form__hint">Los párrafos se separan con una línea en blanco.</span>
                )}
                <span className="pj-counter u-mono">{body.length}&nbsp;/&nbsp;2000</span>
              </div>
            </div>
          </div>

          <footer className="ds-modal__foot">
            <p className="ds-modal__foot-note">
              <Icon name="fileText" size={14} />
              La documentación complementa la ficha y no sustituye la trazabilidad de ejecuciones.
            </p>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              <Icon name="checkCircle" size={16} />
              {mode === 'create' ? 'Guardar documentación' : 'Actualizar documentación'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
