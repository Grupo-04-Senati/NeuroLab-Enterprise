import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { NetworkFamily } from '@/types/domain';
import type { ProjectRecord, ProjectStatus } from '@/types/project';
import { familyMeta } from '@/lib/nav';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import {
  PROJECT_FAMILIES,
  hasFormErrors,
  normalizeTag,
  projectStatusMeta,
  validateProjectForm,
  type ProjectFormErrors,
  type ProjectFormPayload,
} from '@/features/projects/model';

interface ProjectFormDialogProps {
  mode: 'create' | 'edit';
  project?: ProjectRecord;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => void;
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  value
    .split(',')
    .map(normalizeTag)
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    });
  return tags;
}

export function ProjectFormDialog({ mode, project, onClose, onSubmit }: ProjectFormDialogProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [family, setFamily] = useState<NetworkFamily>(project?.family ?? 'FEEDFORWARD');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'DRAFT');
  const [tags, setTags] = useState(project?.tags.join(', ') ?? '');
  const [attempted, setAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const parsedTags = useMemo(() => parseTags(tags), [tags]);
  const payload: ProjectFormPayload = {
    name: name.trim(),
    description: description.trim(),
    family,
    status,
    tags: parsedTags,
  };
  const errors: ProjectFormErrors = validateProjectForm(payload);
  const statusOptions: ProjectStatus[] =
    mode === 'create' ? ['DRAFT', 'ACTIVE'] : ['DRAFT', 'ACTIVE', 'ARCHIVED'];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (hasFormErrors(errors)) {
      if (errors.name) nameRef.current?.focus();
      return;
    }
    onSubmit(payload);
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
        aria-labelledby="pj-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M02 · Proyectos de IA</p>
            <h2 id="pj-form-title">
              {mode === 'create' ? 'Crear proyecto' : `Editar ${project?.name}`}
            </h2>
            <p className="ds-modal__lede">
              {mode === 'create'
                ? 'Registra el nombre y el problema que se quiere resolver. Quedarás como responsable y podrás invitar al equipo.'
                : 'Los cambios actualizan la ficha del proyecto y quedan trazados con fecha y autor.'}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <form className="ds-form" onSubmit={handleSubmit} noValidate>
          <div className="ds-modal__body">
            {attempted && hasFormErrors(errors) ? (
              <p className="ds-form__error" role="alert">
                Revisa los campos marcados antes de continuar.
              </p>
            ) : null}

            <fieldset className="ds-form__section">
              <legend>Identidad del proyecto</legend>
              <div className="ds-form__grid">
                <div className="ds-field ds-field--wide">
                  <label htmlFor="pj-field-name">Nombre del proyecto</label>
                  <input
                    id="pj-field-name"
                    ref={nameRef}
                    className="ds-input"
                    type="text"
                    value={name}
                    maxLength={80}
                    aria-invalid={Boolean(errors.name && (attempted || nameTouched))}
                    onBlur={() => setNameTouched(true)}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="p. ej. Scoring de riesgo de fuga"
                  />
                  {errors.name && (attempted || nameTouched) ? (
                    <span className="ds-field__error">{errors.name}</span>
                  ) : null}
                </div>

                <div className="ds-field">
                  <label htmlFor="pj-field-family">Familia de red</label>
                  <select
                    id="pj-field-family"
                    className="ds-input"
                    value={family}
                    onChange={(event) => setFamily(event.target.value as NetworkFamily)}
                  >
                    {PROJECT_FAMILIES.map((option) => (
                      <option key={option} value={option}>
                        {familyMeta[option].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="pj-field-status">Estado</label>
                  <select
                    id="pj-field-status"
                    className="ds-input"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {projectStatusMeta[option].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="ds-form__section">
              <legend>Problema a resolver</legend>
              <div className="ds-field">
                <label htmlFor="pj-field-description">Descripción del problema</label>
                <textarea
                  id="pj-field-description"
                  className="ds-input ds-input--area"
                  rows={4}
                  value={description}
                  maxLength={600}
                  aria-invalid={Boolean(errors.description && (attempted || descriptionTouched))}
                  onBlur={() => setDescriptionTouched(true)}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Qué decisión debe apoyar el modelo, sobre qué datos y con qué restricciones."
                />
                <div className="pj-field-foot">
                  {errors.description && (attempted || descriptionTouched) ? (
                    <span className="ds-field__error">{errors.description}</span>
                  ) : (
                    <span />
                  )}
                  <span className="pj-counter u-mono">{description.length}&nbsp;/&nbsp;600</span>
                </div>
              </div>
            </fieldset>

            <fieldset className="ds-form__section">
              <legend>Clasificación</legend>
              <div className="ds-field">
                <label htmlFor="pj-field-tags">Etiquetas</label>
                <input
                  id="pj-field-tags"
                  className="ds-input"
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="separadas por comas: riesgo, binario, customer-success"
                />
                <p className="ds-form__hint" data-tone={errors.tags ? 'error' : 'ok'}>
                  {errors.tags ?? 'Hasta 8 etiquetas. Se eliminan duplicados automáticamente.'}
                </p>
                {parsedTags.length > 0 ? (
                  <ul className="pj-tags pj-tags--form" aria-label="Etiquetas que se guardarán">
                    {parsedTags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </fieldset>
          </div>

          <footer className="ds-modal__foot">
            <p className="ds-modal__foot-note">
              <Icon name="shield" size={14} />
              La pertenencia al proyecto se comprueba en cada consulta y acción (§11).
            </p>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              <Icon name="checkCircle" size={16} />
              {mode === 'create' ? 'Crear proyecto' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
