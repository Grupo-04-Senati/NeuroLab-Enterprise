import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import type {
  DatasetAccess,
  DatasetFormat,
  DatasetPrivacy,
  DatasetProject,
  DatasetRecord,
  DatasetSplit,
} from '@/types/dataset';
import { Icon } from '@/components/ui/Icon';
import {
  DATASET_LICENSES,
  datasetAccessMeta,
  datasetFormatMeta,
  datasetPrivacyMeta,
  formatBytes,
  validateSplit,
} from '@/features/datasets/model';
import { SplitBar } from '@/features/datasets/SplitBar';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

export interface DatasetFormPayload {
  name: string;
  projectId: string;
  format: DatasetFormat;
  license: string;
  privacy: DatasetPrivacy;
  access: DatasetAccess;
  description: string;
  tags: string[];
  rows: number;
  split: DatasetSplit;
  fileName: string;
  sizeBytes: number;
}

interface DatasetFormDialogProps {
  mode: 'create' | 'version';
  dataset?: DatasetRecord;
  projects: DatasetProject[];
  onClose: () => void;
  onSubmit: (payload: DatasetFormPayload) => void;
}

const FORMATS: DatasetFormat[] = ['CSV', 'JSON', 'NPZ', 'ZIP'];

/** Validación de carga controlada: extensión, tamaño y archivo no vacío. */
function validateFile(file: File, format: DatasetFormat): string | null {
  const meta = datasetFormatMeta[format];
  const name = file.name.toLowerCase();
  if (!meta.extensions.some((extension) => name.endsWith(extension))) {
    return `Extensión no permitida para ${meta.label}. Se admiten ${meta.extensions.join(', ')}.`;
  }
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > meta.maxBytes) {
    return `El archivo supera el máximo de ${formatBytes(meta.maxBytes)} para ${meta.label}.`;
  }
  return null;
}

export function DatasetFormDialog({
  mode,
  dataset,
  projects,
  onClose,
  onSubmit,
}: DatasetFormDialogProps) {
  const [name, setName] = useState(dataset?.name ?? '');
  const [projectId, setProjectId] = useState(dataset?.projectId ?? projects[0]?.id ?? '');
  const [format, setFormat] = useState<DatasetFormat>(dataset?.format ?? 'CSV');
  const [license, setLicense] = useState<string>(dataset?.license ?? DATASET_LICENSES[0]);
  const [privacy, setPrivacy] = useState<DatasetPrivacy>(dataset?.privacy ?? 'INTERNAL');
  const [access, setAccess] = useState<DatasetAccess>(dataset?.access ?? 'PROJECT');
  const [description, setDescription] = useState(dataset?.description ?? '');
  const [tags, setTags] = useState(dataset?.tags.join(', ') ?? '');
  const [rows, setRows] = useState(dataset?.rows ?? 1000);
  const [split, setSplit] = useState<DatasetSplit>(
    dataset?.split ?? { train: 70, validation: 15, test: 15 },
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    if (mode === 'create') nameRef.current?.focus();
    else fileRef.current?.focus();
  }, [mode]);

  const meta = datasetFormatMeta[format];
  const splitCheck = validateSplit(split);
  const nameError = name.trim().length < 3 ? 'El nombre debe tener al menos 3 caracteres.' : null;
  const rowsError = !Number.isFinite(rows) || rows < 1 ? 'Indica al menos una fila.' : null;
  const fileError = useMemo(() => {
    if (!file) return attempted ? 'Adjunta el archivo del dataset.' : null;
    return validateFile(file, format);
  }, [file, format, attempted]);

  const valid =
    !nameError && !rowsError && !fileError && splitCheck.ok && file !== null && projectId !== '';

  const updateSplit = (key: keyof DatasetSplit, value: number) => {
    setSplit((previous) => ({ ...previous, [key]: value }));
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!valid || !file) {
      if (nameError) nameRef.current?.focus();
      else if (!file) fileRef.current?.focus();
      return;
    }
    onSubmit({
      name: name.trim(),
      projectId,
      format,
      license,
      privacy,
      access,
      description: description.trim(),
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      rows: Math.max(1, Math.round(rows)),
      split,
      fileName: file.name,
      sizeBytes: file.size,
    });
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
        aria-labelledby="ds-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M05 · Datasets</p>
            <h2 id="ds-form-title">
              {mode === 'create' ? 'Registrar dataset' : `Nueva versión · ${dataset?.name}`}
            </h2>
            <p className="ds-modal__lede">
              {mode === 'create'
                ? 'Los metadatos se guardan en la base de datos; el archivo permanece en almacenamiento de objetos y nunca se ejecuta.'
                : `Se publicará la versión v${(dataset?.currentVersion ?? 0) + 1}. La versión actual se conserva sin cambios.`}
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

            <fieldset className="ds-form__section">
              <legend>Metadatos</legend>
              <div className="ds-form__grid">
                <div className="ds-field">
                  <label htmlFor="ds-field-name">Nombre del dataset</label>
                  <input
                    id="ds-field-name"
                    ref={nameRef}
                    className="ds-input"
                    type="text"
                    value={name}
                    disabled={mode === 'version'}
                    aria-invalid={Boolean(nameError && (attempted || nameTouched))}
                    onBlur={() => setNameTouched(true)}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="p. ej. MNIST 28×28"
                  />
                  {nameError && (attempted || nameTouched) ? (
                    <span className="ds-field__error">{nameError}</span>
                  ) : null}
                </div>

                <div className="ds-field">
                  <label htmlFor="ds-field-project">Proyecto</label>
                  <select
                    id="ds-field-project"
                    className="ds-input"
                    value={projectId}
                    disabled={mode === 'version'}
                    onChange={(event) => setProjectId(event.target.value)}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} · {project.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="ds-field-format">Formato</label>
                  <select
                    id="ds-field-format"
                    className="ds-input"
                    value={format}
                    onChange={(event) => setFormat(event.target.value as DatasetFormat)}
                  >
                    {FORMATS.map((option) => (
                      <option key={option} value={option}>
                        {datasetFormatMeta[option].label} · máx. {formatBytes(datasetFormatMeta[option].maxBytes)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="ds-field-license">Licencia</label>
                  <select
                    id="ds-field-license"
                    className="ds-input"
                    value={license}
                    onChange={(event) => setLicense(event.target.value)}
                  >
                    {DATASET_LICENSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="ds-field-privacy">Privacidad</label>
                  <select
                    id="ds-field-privacy"
                    className="ds-input"
                    value={privacy}
                    onChange={(event) => setPrivacy(event.target.value as DatasetPrivacy)}
                  >
                    {(Object.keys(datasetPrivacyMeta) as DatasetPrivacy[]).map((option) => (
                      <option key={option} value={option}>
                        {datasetPrivacyMeta[option].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="ds-field-access">Acceso</label>
                  <select
                    id="ds-field-access"
                    className="ds-input"
                    value={access}
                    onChange={(event) => setAccess(event.target.value as DatasetAccess)}
                  >
                    {(Object.keys(datasetAccessMeta) as DatasetAccess[]).map((option) => (
                      <option key={option} value={option}>
                        {datasetAccessMeta[option].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="ds-form__section">
              <legend>Archivo y particiones</legend>

              <label
                className="ds-dropzone"
                data-state={
                  dragging ? 'dragging' : fileError ? 'error' : file ? 'ready' : 'idle'
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="u-sr-only"
                  accept={meta.accept}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <span className="ds-dropzone__icon">
                  <Icon name="upload" size={20} />
                </span>
                <span className="ds-dropzone__text">
                  <strong>
                    {file ? file.name : 'Arrastra el archivo aquí o pulsa para seleccionarlo'}
                  </strong>
                  <span>
                    {file
                      ? `${formatBytes(file.size)} · ${meta.description}`
                      : `Se admiten ${meta.extensions.join(', ')} · máximo ${formatBytes(meta.maxBytes)}`}
                  </span>
                </span>
                {file ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      clearFile();
                    }}
                  >
                    Quitar
                  </button>
                ) : null}
              </label>
              {fileError ? (
                <span className="ds-field__error" role="alert">
                  {fileError}
                </span>
              ) : null}

              <div className="ds-form__grid ds-form__grid--split">
                <div className="ds-field">
                  <label htmlFor="ds-field-rows">Filas registradas</label>
                  <input
                    id="ds-field-rows"
                    className="ds-input"
                    type="number"
                    min={1}
                    step={1}
                    value={rows}
                    aria-invalid={Boolean(rowsError && attempted)}
                    onChange={(event) =>
                      setRows(event.target.value === '' ? 0 : Number(event.target.value))
                    }
                  />
                  {rowsError && attempted ? (
                    <span className="ds-field__error">{rowsError}</span>
                  ) : null}
                </div>
                <div className="ds-field">
                  <label htmlFor="ds-field-train">Entrenamiento %</label>
                  <input
                    id="ds-field-train"
                    className="ds-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={split.train}
                    onChange={(event) =>
                      updateSplit('train', event.target.value === '' ? 0 : Number(event.target.value))
                    }
                  />
                </div>
                <div className="ds-field">
                  <label htmlFor="ds-field-validation">Validación %</label>
                  <input
                    id="ds-field-validation"
                    className="ds-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={split.validation}
                    onChange={(event) =>
                      updateSplit(
                        'validation',
                        event.target.value === '' ? 0 : Number(event.target.value),
                      )
                    }
                  />
                </div>
                <div className="ds-field">
                  <label htmlFor="ds-field-test">Prueba %</label>
                  <input
                    id="ds-field-test"
                    className="ds-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={split.test}
                    onChange={(event) =>
                      updateSplit('test', event.target.value === '' ? 0 : Number(event.target.value))
                    }
                  />
                </div>
              </div>

              <div className="ds-form__split">
                <SplitBar split={split} size="lg" />
                <span className="ds-form__split-total" data-ok={splitCheck.ok}>
                  {splitCheck.total}&nbsp;%
                </span>
              </div>
              <p className="ds-form__hint" data-tone={splitCheck.ok ? 'ok' : 'error'}>
                {splitCheck.message}
              </p>
            </fieldset>

            <fieldset className="ds-form__section">
              <legend>Contexto</legend>
              <div className="ds-form__grid">
                <div className="ds-field ds-field--wide">
                  <label htmlFor="ds-field-description">Descripción</label>
                  <textarea
                    id="ds-field-description"
                    className="ds-input ds-input--area"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Origen, transformaciones aplicadas y uso previsto."
                  />
                </div>
                <div className="ds-field ds-field--wide">
                  <label htmlFor="ds-field-tags">Etiquetas</label>
                  <input
                    id="ds-field-tags"
                    className="ds-input"
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="separadas por comas: visión, benchmark"
                  />
                </div>
              </div>
            </fieldset>
          </div>

          <footer className="ds-modal__foot">
            <p className="ds-modal__foot-note">
              <Icon name="shield" size={14} />
              Validación de extensión, tamaño y contenido antes de publicar. Las versiones son inmutables.
            </p>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              <Icon name="checkCircle" size={16} />
              {mode === 'create' ? 'Registrar dataset' : 'Publicar versión'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
