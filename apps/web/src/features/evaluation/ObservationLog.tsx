import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import type {
  EvaluationRun,
  Observation,
  ObservationDraft,
  ObservationKind,
} from '@/types/evaluation';
import { formatRelativeTime } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import {
  observationKindMeta,
  OBSERVATION_FILTERS,
} from '@/features/evaluation/model';

const KINDS: ObservationKind[] = ['LIMITATION', 'OBSERVATION', 'RISK'];

export interface ObservationLogProps {
  runs: EvaluationRun[];
  observations: Observation[];
  currentRunId: string;
  filter: ObservationKind | 'ALL';
  onFilter: (filter: ObservationKind | 'ALL') => void;
  onAdd: (draft: ObservationDraft) => void;
  onToggleReviewed: (observationId: string) => void;
  titleRef: RefObject<HTMLInputElement>;
}

export function ObservationLog({
  runs,
  observations,
  currentRunId,
  filter,
  onFilter,
  onAdd,
  onToggleReviewed,
  titleRef,
}: ObservationLogProps) {
  const [kind, setKind] = useState<ObservationKind>('LIMITATION');
  const [runId, setRunId] = useState(currentRunId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      observations
        .filter((item) => filter === 'ALL' || item.kind === filter)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [observations, filter],
  );

  const counts = useMemo(() => {
    const base: Record<ObservationKind | 'ALL', number> = {
      ALL: observations.length,
      LIMITATION: 0,
      OBSERVATION: 0,
      RISK: 0,
    };
    observations.forEach((item) => {
      base[item.kind] += 1;
    });
    return base;
  }, [observations]);

  /* Mantiene el formulario alineado con la ejecución elegida en el resto del informe. */
  useEffect(() => {
    setRunId(currentRunId);
  }, [currentRunId]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < 4) {
      setError('Escriba un título de al menos 4 caracteres.');
      titleRef.current?.focus();
      return;
    }
    if (cleanBody.length < 12) {
      setError('El detalle debe describir el hallazgo con al menos 12 caracteres.');
      return;
    }
    onAdd({ runId, kind, title: cleanTitle, body: cleanBody });
    setTitle('');
    setBody('');
    setError(null);
  };

  return (
    <div className="ev-observe">
      <form className="ev-form" onSubmit={submit} noValidate aria-label="Añadir registro de evaluación">
        <h3 className="ev-form__title">Nuevo registro</h3>
        <div className="ev-form__grid">
          <label className="ev-field">
            <span>Tipo</span>
            <select
              className="ev-input"
              value={kind}
              onChange={(event) => setKind(event.target.value as ObservationKind)}
            >
              {KINDS.map((item) => (
                <option key={item} value={item}>
                  {observationKindMeta[item].label}
                </option>
              ))}
            </select>
          </label>
          <label className="ev-field">
            <span>Ejecución</span>
            <select
              className="ev-input"
              value={runId}
              onChange={(event) => setRunId(event.target.value)}
            >
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id} · {run.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ev-field ev-field--wide">
            <span>Título</span>
            <input
              ref={titleRef}
              className="ev-input"
              value={title}
              placeholder="p. ej. Falsos negativos en fisuras finas"
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) setError(null);
              }}
            />
          </label>
          <label className="ev-field ev-field--wide">
            <span>Detalle</span>
            <textarea
              className="ev-input ev-input--area"
              rows={3}
              value={body}
              placeholder="Condición observada, evidencia y acción recomendada."
              onChange={(event) => {
                setBody(event.target.value);
                if (error) setError(null);
              }}
            />
          </label>
        </div>
        {error ? (
          <p className="ev-form__error" role="alert">
            <Icon name="alertCircle" size={14} />
            {error}
          </p>
        ) : null}
        <div className="ev-form__foot">
          <p className="ev-form__hint">
            Se guardan autor y fecha. Los registros no se eliminan desde la demo.
          </p>
          <button type="submit" className="btn btn--primary btn--sm">
            <Icon name="plus" size={14} />
            Añadir registro
          </button>
        </div>
      </form>

      <div className="ev-log-block">
        <div className="ev-log-toolbar">
          <div className="filters" role="group" aria-label="Filtrar registros">
            {OBSERVATION_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="filter-btn"
                aria-pressed={filter === item.id}
                onClick={() => onFilter(item.id)}
              >
                {item.label}
                <span className="filter-btn__count">{counts[item.id]}</span>
              </button>
            ))}
          </div>
          <span className="ev-log-count">
            {filtered.length} de {observations.length} registros
          </span>
        </div>

        <div className="ev-log" aria-live="polite">
          {filtered.length === 0 ? (
            <div className="empty">
              <Icon name="report" size={22} />
              <h3>Sin registros en este filtro</h3>
              <p>Añada una limitación, observación o riesgo para dejar constancia de la evaluación.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const kindMeta = observationKindMeta[item.kind];
              const run = runs.find((candidate) => candidate.id === item.runId);
              return (
                <article
                  key={item.id}
                  className="ev-entry"
                  data-kind={item.kind}
                  data-reviewed={item.reviewed || undefined}
                >
                  <span className="ev-entry__icon" aria-hidden="true">
                    <Icon name={kindMeta.icon} size={16} />
                  </span>
                  <div className="ev-entry__body">
                    <div className="ev-entry__head">
                      <span className="ev-entry__kind">{kindMeta.label}</span>
                      <h3>{item.title}</h3>
                      {item.reviewed ? (
                        <span className="ev-entry__state">
                          <Icon name="checkCircle" size={12} />
                          Revisado
                        </span>
                      ) : null}
                    </div>
                    <p>{item.body}</p>
                    <div className="ev-entry__meta">
                      <span className="ev-entry__run">
                        {item.runId}
                        {run ? ` · ${run.name}` : ''}
                      </span>
                      <span>{item.author}</span>
                      <span>{formatRelativeTime(item.createdAt)}</span>
                      <button
                        type="button"
                        className="ev-entry__action"
                        onClick={() => onToggleReviewed(item.id)}
                      >
                        {item.reviewed ? 'Reabrir' : 'Marcar revisado'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
