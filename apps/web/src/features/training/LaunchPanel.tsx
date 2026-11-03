import { useMemo } from 'react';
import type { Actor } from '@/types/domain';
import { familyMeta } from '@/lib/nav';
import { formatDuration, formatNumber } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  LIMITS,
  OPTIMIZERS,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  estimate,
  maxPriorityFor,
  validateLaunch,
  versionFor,
} from '@/features/training/model';
import type { LaunchValues, ProjectOption } from '@/features/training/model';

/* §6 M06 · configuración del entrenamiento: épocas, batch size y optimizador, con
   validación en vivo y estimación de recursos antes de encolar. */

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  warning?: string;
  wide?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, hint, error, warning, wide, children }: FieldProps) {
  return (
    <div className={wide ? 'tr-field tr-field--wide' : 'tr-field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="tr-field__msg" data-tone="error" id={`${id}-error`}>
          <Icon name="alertCircle" size={12} />
          {error}
        </p>
      ) : warning ? (
        <p className="tr-field__msg" data-tone="warning" id={`${id}-error`}>
          <Icon name="alertTriangle" size={12} />
          {warning}
        </p>
      ) : hint ? (
        <p className="tr-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

interface LaunchPanelProps {
  actor: Actor;
  projects: ProjectOption[];
  values: LaunchValues;
  onChange: (patch: Partial<LaunchValues>) => void;
  onLaunch: () => void;
}

export function LaunchPanel({ actor, projects, values, onChange, onLaunch }: LaunchPanelProps) {
  const project = projects.find((item) => item.id === values.projectId);
  const architecture = project?.architectures.find((item) => item.name === values.architecture) ?? null;
  const issues = useMemo(() => validateLaunch(values, actor), [values, actor]);
  const optimizer = OPTIMIZERS.find((item) => item.id === values.optimizer);
  const ceiling = maxPriorityFor(actor);

  const epochs = Number(values.epochs.replace(',', '.'));
  const batch = Number(values.batch.replace(',', '.'));
  const preview = architecture && Number.isFinite(epochs) && Number.isFinite(batch)
    ? estimate(architecture.family, batch, epochs)
    : null;

  const blocked = Object.keys(issues.errors).length > 0 || !project;

  return (
    <Panel
      title="Configurar y encolar entrenamiento"
      subtitle="Épocas, tamaño de lote y optimizador definen el grafo que compila el worker; la prioridad decide cuándo lo atiende."
      icon="training"
      actions={
        architecture ? (
          <Chip tone="neutral" title={`Familia ${familyMeta[architecture.family].label}`}>
            {familyMeta[architecture.family].glyph} · {versionFor(values.architecture)}
          </Chip>
        ) : (
          <Chip tone="neutral">Sin arquitectura seleccionada</Chip>
        )
      }
      footer={
        <>
          <span>
            El reintento de un trabajo crea uno nuevo y conserva la trazabilidad de origen (§10).
          </span>
          <a href="/architectures">Diseñar arquitectura</a>
        </>
      }
    >
      <form
        className="tr-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) onLaunch();
        }}
        noValidate
      >
        <fieldset className="tr-form__section">
          <legend>Qué se entrena</legend>
          <div className="tr-form__grid">
            <Field
              id="tr-project"
              label="Proyecto"
              error={issues.errors.projectId}
              wide
            >
              <select
                id="tr-project"
                className="tr-input"
                value={values.projectId}
                aria-invalid={Boolean(issues.errors.projectId)}
                onChange={(event) =>
                  onChange({ projectId: event.target.value, architecture: '', dataset: '' })
                }
              >
                <option value="">Seleccione un proyecto…</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.id}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="tr-architecture"
              label="Arquitectura"
              error={issues.errors.architecture}
              hint={
                project && project.architectures.length > 0
                  ? `${project.architectures.length} validada${project.architectures.length === 1 ? '' : 's'} en ${project.id}.`
                  : undefined
              }
            >
              <select
                id="tr-architecture"
                className="tr-input"
                value={values.architecture}
                disabled={!project || project.architectures.length === 0}
                aria-invalid={Boolean(issues.errors.architecture)}
                onChange={(event) => onChange({ architecture: event.target.value })}
              >
                <option value="">
                  {project && project.architectures.length === 0 ? 'Sin arquitecturas validadas' : 'Seleccione…'}
                </option>
                {project?.architectures.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} · {familyMeta[item.family].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="tr-dataset"
              label="Dataset"
              error={issues.errors.dataset}
              hint={
                project && project.datasets.length > 0
                  ? `${project.datasets.length} dataset${project.datasets.length === 1 ? '' : 's'} publicado${project.datasets.length === 1 ? '' : 's'} por M05.`
                  : undefined
              }
            >
              <select
                id="tr-dataset"
                className="tr-input"
                value={values.dataset}
                disabled={!project || project.datasets.length === 0}
                aria-invalid={Boolean(issues.errors.dataset)}
                onChange={(event) => onChange({ dataset: event.target.value })}
              >
                <option value="">
                  {project && project.datasets.length === 0 ? 'Sin datasets registrados' : 'Seleccione…'}
                </option>
                {project?.datasets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>

            {project && (project.architectures.length === 0 || project.datasets.length === 0) ? (
              <p className="tr-form__notice" data-tone="warning">
                <Icon name="alertTriangle" size={14} />
                <span>
                  {project.architectures.length === 0 ? (
                    <>
                      Este proyecto no tiene arquitectura validada. Cree el grafo en{' '}
                      <a href="/architectures">M04 · Diseñador de arquitecturas</a> antes de entrenar.
                    </>
                  ) : (
                    <>
                      Este proyecto no tiene dataset publicado. Cárguelo y divídalo en{' '}
                      <a href="/datasets">M05 · Datasets</a> antes de entrenar.
                    </>
                  )}
                </span>
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="tr-form__section">
          <legend>Ciclo de entrenamiento</legend>
          <div className="tr-form__grid">
            <Field
              id="tr-epochs"
              label="Épocas"
              hint={`Entre ${LIMITS.epochs.min} y ${LIMITS.epochs.max}.`}
              error={issues.errors.epochs}
            >
              <input
                id="tr-epochs"
                className="tr-input"
                type="number"
                inputMode="numeric"
                min={LIMITS.epochs.min}
                max={LIMITS.epochs.max}
                step={1}
                value={values.epochs}
                aria-invalid={Boolean(issues.errors.epochs)}
                onChange={(event) => onChange({ epochs: event.target.value })}
              />
            </Field>

            <Field
              id="tr-batch"
              label="Tamaño de lote"
              hint={`Entre ${LIMITS.batch.min} y ${LIMITS.batch.max} muestras.`}
              error={issues.errors.batch}
              warning={issues.warnings.batch}
            >
              <input
                id="tr-batch"
                className="tr-input"
                type="number"
                inputMode="numeric"
                min={LIMITS.batch.min}
                max={LIMITS.batch.max}
                step={1}
                value={values.batch}
                aria-invalid={Boolean(issues.errors.batch || issues.warnings.batch)}
                onChange={(event) => onChange({ batch: event.target.value })}
              />
            </Field>

            <Field
              id="tr-optimizer"
              label="Optimizador"
              hint={optimizer?.hint}
            >
              <select
                id="tr-optimizer"
                className="tr-input"
                value={values.optimizer}
                onChange={(event) => onChange({ optimizer: event.target.value })}
              >
                {OPTIMIZERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="tr-rate"
              label="Tasa de aprendizaje"
              hint="Acepta coma decimal; el worker la registra en la semilla del experimento."
              error={issues.errors.learningRate}
              warning={issues.warnings.learningRate}
            >
              <input
                id="tr-rate"
                className="tr-input"
                type="text"
                inputMode="decimal"
                placeholder="0,001"
                value={values.learningRate}
                aria-invalid={Boolean(issues.errors.learningRate || issues.warnings.learningRate)}
                onChange={(event) => onChange({ learningRate: event.target.value })}
              />
            </Field>

            <Field
              id="tr-seed"
              label="Semilla"
              error={issues.errors.seed}
              hint="Determinismo del experimento: la misma semilla reproduce la misma curva."
            >
              <input
                id="tr-seed"
                className="tr-input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values.seed}
                aria-invalid={Boolean(issues.errors.seed)}
                onChange={(event) => onChange({ seed: event.target.value })}
              />
            </Field>

            <Field
              id="tr-priority"
              label="Prioridad en cola"
              error={issues.errors.priority}
              hint={`Su rol permite hasta ${PRIORITY_LABEL[ceiling].toLowerCase()}.`}
            >
              <select
                id="tr-priority"
                className="tr-input"
                value={values.priority}
                aria-invalid={Boolean(issues.errors.priority)}
                onChange={(event) => onChange({ priority: event.target.value as LaunchValues['priority'] })}
              >
                {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((key) => (
                  <option key={key} value={key} disabled={PRIORITY_RANK[key] < PRIORITY_RANK[ceiling]}>
                    {PRIORITY_LABEL[key]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <div className="tr-forecast">
          <p className="u-caps">Estimación de recursos</p>
          {preview ? (
            <dl className="tr-forecast__grid">
              <div>
                <dt>Ritmo por época</dt>
                <dd className="u-num">{formatNumber(preview.epochSeconds, 1)}&nbsp;s</dd>
              </div>
              <div>
                <dt>Duración total</dt>
                <dd className="u-num">{formatDuration(preview.totalSeconds)}</dd>
              </div>
              <div>
                <dt>Horas de GPU</dt>
                <dd className="u-num">{formatNumber(preview.gpuHours, 2)}</dd>
              </div>
              <div>
                <dt>Muestra por paso</dt>
                <dd className="u-num">{formatNumber(batch)}</dd>
              </div>
            </dl>
          ) : (
            <p className="tr-forecast__empty">
              Seleccione arquitectura y escriba épocas y lote válidos para calcular el coste.
            </p>
          )}
          {preview?.overLimit ? (
            <p className="tr-form__notice" data-tone="error">
              <Icon name="alertTriangle" size={14} />
              <span>
                Supera el tope de {LIMITS.maxGpuHours}&nbsp;h de GPU por trabajo; el scheduler lo detendrá
                a mitad de ciclo. Reduzca épocas o lote.
              </span>
            </p>
          ) : null}

          <div className="tr-form__actions">
            <button type="submit" className="btn btn--primary" disabled={blocked}>
              <Icon name="zap" size={15} />
              Encolar ejecución
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onChangeReset(onChange)}>
              <Icon name="refresh" size={15} />
              Restablecer
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function onChangeReset(onChange: (patch: Partial<LaunchValues>) => void) {
  onChange({
    epochs: '60',
    batch: '64',
    optimizer: 'adam',
    learningRate: '0,001',
    seed: '2026',
    priority: 'NORMAL',
  });
}
