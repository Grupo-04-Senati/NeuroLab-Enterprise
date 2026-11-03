import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Actor } from '@/types/domain';
import type { DirectoryUser, ProjectDocument, ProjectRecord } from '@/types/project';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import {
  canEditDocumentation,
  hasTag,
  normalizeTag,
  resolveUser,
} from '@/features/projects/model';

interface ProjectDocsTabProps {
  project: ProjectRecord;
  users: DirectoryUser[];
  actor: Actor;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddDoc: () => void;
  onEditDoc: (document: ProjectDocument) => void;
  onDeleteDoc: (document: ProjectDocument) => void;
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ProjectDocsTab({
  project,
  users,
  actor,
  onAddTag,
  onRemoveTag,
  onAddDoc,
  onEditDoc,
  onDeleteDoc,
}: ProjectDocsTabProps) {
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const canEdit = canEditDocumentation(project, actor);
  const documents = [...project.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleAddTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const proposed = normalizeTag(tagDraft);
    if (proposed.length < 2) {
      setTagError('La etiqueta debe tener al menos 2 caracteres.');
      return;
    }
    if (proposed.length > 24) {
      setTagError('La etiqueta no puede superar 24 caracteres.');
      return;
    }
    if (hasTag(project, proposed)) {
      setTagError('Esa etiqueta ya está asignada al proyecto.');
      return;
    }
    if (project.tags.length >= 8) {
      setTagError('El proyecto ya tiene el máximo de 8 etiquetas.');
      return;
    }
    onAddTag(proposed);
    setTagDraft('');
    setTagError(null);
  };

  return (
    <div className="pj-docs-tab">
      <section className="pj-block" aria-labelledby="pj-tags-title">
        <div className="pj-block__head">
          <h3 id="pj-tags-title">Etiquetas</h3>
          <span className="u-caps">{project.tags.length} de 8</span>
        </div>
        <ul className="pj-tags" aria-label="Etiquetas del proyecto">
          {project.tags.map((tag) => (
            <li key={tag}>
              <Icon name="tag" size={11} />
              {tag}
              {canEdit ? (
                <button
                  type="button"
                  className="pj-tag__remove"
                  aria-label={`Quitar etiqueta ${tag}`}
                  onClick={() => onRemoveTag(tag)}
                >
                  <Icon name="close" size={11} strokeWidth={2.2} />
                </button>
              ) : null}
            </li>
          ))}
          {project.tags.length === 0 ? <li className="pj-tag--empty">Sin etiquetas</li> : null}
        </ul>

        {canEdit ? (
          <>
            <form className="pj-tag-editor" onSubmit={handleAddTag}>
              <label className="u-sr-only" htmlFor="pj-tag-input">
                Nueva etiqueta
              </label>
              <input
                id="pj-tag-input"
                className="ds-input"
                type="text"
                value={tagDraft}
                maxLength={24}
                placeholder="Nueva etiqueta · p. ej. clasificación"
                onChange={(event) => {
                  setTagDraft(event.target.value);
                  if (tagError) setTagError(null);
                }}
              />
              <button type="submit" className="btn btn--secondary btn--sm" disabled={!tagDraft.trim()}>
                <Icon name="plus" size={14} />
                Añadir
              </button>
            </form>
            {tagError ? (
              <p className="ds-field__error" role="alert">
                {tagError}
              </p>
            ) : (
              <p className="ds-form__hint">
                Las etiquetas clasifican el proyecto y alimentan los filtros de la cartera.
              </p>
            )}
          </>
        ) : (
          <p className="pj-policy-note">
            <Icon name="lock" size={14} />
            Tu rol permite consultar las etiquetas, pero solo responsables e ingenieros pueden modificarlas.
          </p>
        )}
      </section>

      <section className="pj-block" aria-labelledby="pj-docs-title">
        <div className="pj-block__head">
          <h3 id="pj-docs-title">Documentación</h3>
          <span className="u-caps">
            {documents.length} {documents.length === 1 ? 'página' : 'páginas'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="empty pj-empty">
            <Icon name="fileText" />
            <h3>Aún no hay documentación</h3>
            <p>
              Guarda el contexto, los supuestos y las restricciones del proyecto para que el equipo no
              dependa del conocimiento individual.
            </p>
            {canEdit ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={onAddDoc}>
                <Icon name="plus" size={14} />
                Añadir documentación
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="pj-doc-list">
            {documents.map((document) => {
              const author = resolveUser(users, document.authorId);
              return (
                <li key={document.id} className="pj-doc">
                  <div className="pj-doc__head">
                    <h4>{document.title}</h4>
                    <span className="pj-doc__meta">
                      {formatRelativeTime(document.updatedAt)} · {formatDate(document.updatedAt)}
                    </span>
                  </div>
                  <p className="pj-doc__author">
                    <Icon name="users" size={12} />
                    {author?.displayName ?? 'Autor desconocido'}
                    <span className="u-mono">{document.id}</span>
                  </p>
                  <div className="pj-doc__body">
                    {paragraphs(document.body).map((paragraph, index) => (
                      <p key={`${document.id}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                  {canEdit ? (
                    <div className="pj-doc__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => onEditDoc(document)}
                      >
                        <Icon name="edit" size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm pj-danger"
                        onClick={() => onDeleteDoc(document)}
                      >
                        <Icon name="trash" size={14} />
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
