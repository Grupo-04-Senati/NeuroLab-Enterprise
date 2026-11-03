import { useEffect, useMemo, useRef, useState } from 'react';
import type { EvaluationMetric, Observation, ObservationDraft, ObservationKind } from '@/types/evaluation';
import { evaluationClasses, evaluationRuns, defaultEvaluationRunId, seedObservations } from '@/lib/mock/evaluation';
import { demoActor } from '@/lib/session';
import { familyMeta } from '@/lib/nav';
import { formatDateTime, formatDuration, formatLoss, formatNumber, formatRate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Chip, StatusChip } from '@/components/ui/Chip';
import { Sparkline } from '@/components/ui/DataViz';
import { LearningChart } from '@/features/evaluation/LearningChart';
import { ConfusionMatrix } from '@/features/evaluation/ConfusionMatrix';
import { ClassMetrics } from '@/features/evaluation/ClassMetrics';
import { ComparisonTable } from '@/features/evaluation/ComparisonTable';
import { ObservationLog } from '@/features/evaluation/ObservationLog';
import {
  loadObservations,
  metricMeta,
  metricsFromConfusion,
  nextObservationId,
  observationKindMeta,
  saveObservations,
  signed,
} from '@/features/evaluation/model';

const CHART_METRICS: EvaluationMetric[] = ['loss', 'accuracy', 'f1'];

interface Notice {
  tone: 'success' | 'info';
  text: string;
}

function Delta({
  value,
  unit = ' pts',
  decimals = 1,
  good,
}: {
  value: number;
  unit?: string;
  decimals?: number;
  good: boolean;
}) {
  return (
    <span className="ev-delta" data-good={good}>
      <Icon name={value >= 0 ? 'trendingUp' : 'trendingDown'} size={12} />
      {signed(value, decimals)}
      {unit}
    </span>
  );
}

export function EvaluationPage() {
  const [runId, setRunId] = useState(defaultEvaluationRunId);
  const [metric, setMetric] = useState<EvaluationMetric>('loss');
  const [normalized, setNormalized] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [observations, setObservations] = useState<Observation[]>(loadObservations);
  const [observationFilter, setObservationFilter] = useState<ObservationKind | 'ALL'>('ALL');
  const [notice, setNotice] = useState<Notice | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const current = evaluationRuns.find((run) => run.id === runId) ?? evaluationRuns[0];
  const currentIndex = evaluationRuns.findIndex((run) => run.id === current.id);
  const previous = evaluationRuns[currentIndex + 1] ?? null;

  const { perClass, summary } = useMemo(
    () => metricsFromConfusion(current.confusion),
    [current],
  );
  const previousSummary = useMemo(
    () => (previous ? metricsFromConfusion(previous.confusion).summary : null),
    [previous],
  );

  useEffect(() => {
    saveObservations(observations);
  }, [observations]);

  const chartRuns = useMemo(
    () => [current, ...evaluationRuns.filter((run) => compareIds.includes(run.id) && run.id !== current.id)],
    [current, compareIds],
  );

  const selectRun = (nextId: string) => {
    setRunId(nextId);
    setCompareIds((previousIds) => previousIds.filter((id) => id !== nextId));
  };

  const toggleCompare = (id: string) => {
    if (id === current.id) return;
    setCompareIds((previousIds) =>
      previousIds.includes(id)
        ? previousIds.filter((candidate) => candidate !== id)
        : previousIds.length >= 2
          ? previousIds
          : [...previousIds, id],
    );
  };

  const handleAddObservation = (draft: ObservationDraft) => {
    const record: Observation = {
      id: nextObservationId(observations),
      runId: draft.runId,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      author: demoActor.displayName,
      createdAt: new Date().toISOString(),
      reviewed: false,
    };
    setObservations((items) => [record, ...items]);
    setObservationFilter('ALL');
    setNotice({
      tone: 'success',
      text: `${record.id} quedó registrado como ${observationKindMeta[record.kind].label.toLowerCase()} de ${record.runId}.`,
    });
  };

  const toggleReviewed = (observationId: string) => {
    setObservations((items) =>
      items.map((item) => (item.id === observationId ? { ...item, reviewed: !item.reviewed } : item)),
    );
  };

  const focusObservationForm = () => {
    titleRef.current?.scrollIntoView({ block: 'center' });
    titleRef.current?.focus({ preventScroll: true });
  };

  const resetDemo = () => {
    setObservations(seedObservations);
    setRunId(defaultEvaluationRunId);
    setCompareIds([]);
    setMetric('loss');
    setNormalized(false);
    setObservationFilter('ALL');
    setNotice({
      tone: 'info',
      text: 'Evaluación demo restaurada: ejecuciones originales y registro base de observaciones.',
    });
  };

  const weakest = perClass[Number(summary.weakestClassId)];
  const weakestLabel = evaluationClasses[Number(summary.weakestClassId)].label;
  const unreviewed = observations.filter((item) => !item.reviewed).length;
  const finalValLoss = current.history[current.history.length - 1].valLoss;

  const f1Delta = previousSummary ? (summary.f1 - previousSummary.f1) * 100 : null;
  const balancedDelta = previousSummary
    ? (summary.balancedAccuracy - previousSummary.balancedAccuracy) * 100
    : null;
  const lossDelta = previous ? current.testLoss - previous.testLoss : null;
  const latencyDelta = previous ? current.latencyP95Ms - previous.latencyP95Ms : null;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="metrics" size={14} strokeWidth={2} />
            M07 · Evaluación y métricas
          </p>
          <h1 className="page-head__title">Evaluación final y comparación de ejecuciones</h1>
          <p className="page-head__lede">
            Consulte la pérdida y las métricas época a época, revise la matriz de confusión sobre la
            partición de prueba y deje constancia de limitaciones antes de registrar una versión del
            modelo.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={resetDemo}>
            <Icon name="refresh" size={16} />
            Restaurar demo
          </button>
          <button type="button" className="btn btn--primary" onClick={focusObservationForm}>
            <Icon name="plus" size={16} />
            Registrar observación
          </button>
        </div>
      </div>

      {notice ? (
        <div className="ds-notice" data-tone={notice.tone} role="status">
          <Icon name={notice.tone === 'success' ? 'checkCircle' : 'info'} size={16} />
          <p>{notice.text}</p>
          <button
            type="button"
            className="ds-notice__close"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      <div className="dash">
        <section className="ev-runbar" aria-label="Ejecución evaluada">
          <label className="ev-runbar__field">
            <span>Ejecución evaluada</span>
            <select
              className="ev-input"
              value={current.id}
              onChange={(event) => selectRun(event.target.value)}
            >
              {evaluationRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id} · {run.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ev-runbar__meta">
            <StatusChip status={current.status} />
            <Chip tone="outline">
              <Icon name="dataset" size={12} />
              {current.dataset} · {current.datasetVersion}
            </Chip>
            <Chip tone="outline">
              <Icon name="layers" size={12} />
              {familyMeta[current.family].label}
            </Chip>
            <Chip tone="outline">
              <Icon name="checkCircle" size={12} />
              Prueba · {formatNumber(current.samples)} muestras
            </Chip>
            <span className="ev-runbar__hint">
              Partición reservada; no intervino en el entrenamiento ni en la selección del
              checkpoint.
            </span>
          </div>
        </section>

        <section className="kpi-grid" aria-label="Indicadores de la evaluación">
          <article className="kpi" data-accent="indigo">
            <div className="kpi__top">
              <h3 className="kpi__label">F1 macro</h3>
              <span className="kpi__icon">
                <Icon name="metrics" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{formatRate(summary.f1)}</p>
              {f1Delta !== null ? (
                <Delta value={f1Delta} good={f1Delta >= 0} />
              ) : null}
            </div>
            <div className="kpi__foot">
              <span>
                Clase más débil: {weakestLabel} · {formatRate(weakest.f1)}
              </span>
              <Sparkline values={current.history.map((point) => point.valF1)} />
            </div>
          </article>

          <article className="kpi" data-accent="emerald">
            <div className="kpi__top">
              <h3 className="kpi__label">Exactitud balanceada</h3>
              <span className="kpi__icon">
                <Icon name="gauge" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{formatRate(summary.balancedAccuracy)}</p>
              {balancedDelta !== null ? (
                <Delta value={balancedDelta} good={balancedDelta >= 0} />
              ) : null}
            </div>
            <div className="kpi__foot">
              <span>
                Prueba · {formatNumber(summary.total)} muestras
              </span>
              <Sparkline
                values={current.history.map((point) => point.valAccuracy)}
                color="var(--c-emerald-500)"
              />
            </div>
          </article>

          <article className="kpi" data-accent="amber">
            <div className="kpi__top">
              <h3 className="kpi__label">Pérdida de prueba</h3>
              <span className="kpi__icon">
                <Icon name="trendingDown" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{formatLoss(current.testLoss)}</p>
              {lossDelta !== null ? (
                <Delta
                  value={lossDelta}
                  unit=""
                  decimals={3}
                  good={lossDelta <= 0}
                />
              ) : null}
            </div>
            <div className="kpi__foot">
              <span>Pérdida val final {formatLoss(finalValLoss)}</span>
              <Sparkline
                values={current.history.map((point) => point.valLoss)}
                color="var(--c-amber-500)"
              />
            </div>
          </article>

          <article className="kpi" data-accent="violet">
            <div className="kpi__top">
              <h3 className="kpi__label">Latencia p95</h3>
              <span className="kpi__icon">
                <Icon name="clock" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">
                {formatNumber(current.latencyP95Ms)}
                <small>ms</small>
              </p>
              {latencyDelta !== null ? (
                <Delta value={latencyDelta} unit=" ms" decimals={0} good={latencyDelta <= 0} />
              ) : null}
            </div>
            <div className="kpi__foot">
              <span>Lote {formatNumber(current.batchSize)} · GPU T4</span>
              <span className="ev-kpi-note">inferencia</span>
            </div>
          </article>
        </section>

        <div className="ev-grid">
          <div className="ev-col">
            <Panel
              title="Pérdida y métricas por época"
              subtitle="Línea continua = entrenamiento; discontinua = validación. Superponga hasta dos ejecuciones desde la comparación."
              icon="metrics"
              actions={
                <div className="filters" role="group" aria-label="Métrica de la gráfica">
                  {CHART_METRICS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="filter-btn"
                      aria-pressed={metric === option}
                      onClick={() => setMetric(option)}
                    >
                      {metricMeta[option].label}
                    </button>
                  ))}
                </div>
              }
            >
              <LearningChart runs={chartRuns} metric={metric} />
              <div className="ev-chart-meta">
                <span>
                  <Icon name="clock" size={13} />
                  Mejor checkpoint · época {current.bestEpoch} de {current.epochs}
                </span>
                <span>
                  <Icon name="layers" size={13} />
                  {chartRuns.length} {chartRuns.length === 1 ? 'ejecución' : 'ejecuciones'} en la
                  gráfica
                </span>
              </div>
              <p className="panel__note">
                El historial llega de{' '}
                <code>GET /training-jobs/&#123;id&#125;/metrics</code>; el navegador solo dibuja la
                curva y no evalúa el modelo (RN-03).
              </p>
            </Panel>

            <Panel
              title="Evaluación final · matriz de confusión"
              subtitle={`Partición de prueba · ${formatNumber(current.samples)} muestras · checkpoint ${current.bestEpoch}`}
              icon="dataset"
              actions={
                <>
                  <Chip tone="completed">Exactitud {formatRate(summary.accuracy)}</Chip>
                  <div className="filters" role="group" aria-label="Vista de la matriz">
                    <button
                      type="button"
                      className="filter-btn"
                      aria-pressed={!normalized}
                      onClick={() => setNormalized(false)}
                    >
                      Recuentos
                    </button>
                    <button
                      type="button"
                      className="filter-btn"
                      aria-pressed={normalized}
                      onClick={() => setNormalized(true)}
                    >
                      Normalizado
                    </button>
                  </div>
                </>
              }
            >
              <ConfusionMatrix run={current} normalized={normalized} />
              <p className="panel__note">
                Fila = clase real; columna = clase predicha. El porcentaje se calcula sobre el
                soporte de la fila. La partición de prueba no participó en el entrenamiento ni en la
                elección del checkpoint.
              </p>
            </Panel>
          </div>

          <div className="ev-col">
            <Panel
              title="Ficha de la ejecución"
              subtitle="Metadatos del entrenamiento evaluado."
              icon="model"
              actions={<StatusChip status={current.status} />}
            >
              <dl className="ev-facts">
                <div>
                  <dt>Ejecución</dt>
                  <dd className="u-mono">
                    {current.id} · {current.jobId}
                  </dd>
                </div>
                <div>
                  <dt>Proyecto</dt>
                  <dd>{current.project}</dd>
                </div>
                <div>
                  <dt>Dataset</dt>
                  <dd>
                    {current.dataset} · {current.datasetVersion}
                  </dd>
                </div>
                <div>
                  <dt>Arquitectura</dt>
                  <dd>
                    {current.architecture} · {familyMeta[current.family].label}
                  </dd>
                </div>
                <div>
                  <dt>Optimizador</dt>
                  <dd>
                    {current.optimizer} · lr {formatNumber(current.learningRate, 4)}
                  </dd>
                </div>
                <div>
                  <dt>Lote / semilla</dt>
                  <dd>
                    {formatNumber(current.batchSize)} · {current.seed}
                  </dd>
                </div>
                <div>
                  <dt>Épocas</dt>
                  <dd>
                    {current.epochs} · mejor {current.bestEpoch}
                  </dd>
                </div>
                <div>
                  <dt>Duración</dt>
                  <dd>{formatDuration(current.durationSeconds)}</dd>
                </div>
                <div>
                  <dt>Finalizada</dt>
                  <dd>{formatDateTime(current.finishedAt)}</dd>
                </div>
              </dl>

              <ul className="ev-checks">
                <li data-ok="true">
                  <Icon name="checkCircle" size={14} />
                  Partición de prueba sin fuga de datos
                </li>
                <li data-ok="true">
                  <Icon name="checkCircle" size={14} />
                  Checkpoint congelado en la época {current.bestEpoch}
                </li>
                <li data-ok="true">
                  <Icon name="checkCircle" size={14} />
                  Métrica primaria declarada: F1 macro
                </li>
              </ul>
              <p className="panel__note">
                Las ejecuciones evaluadas con distintas versiones del dataset no son estrictamente
                comparables; consulte el registro de limitaciones antes de decidir la promoción.
              </p>
            </Panel>

            <Panel
              title="Métricas por clase"
              subtitle="Precisión, recall y F1 sobre la partición de prueba."
              icon="layers"
              actions={<Chip tone="outline">macro F1 {formatRate(summary.f1)}</Chip>}
            >
              <ClassMetrics run={current} />
            </Panel>
          </div>
        </div>

        <Panel
          title="Comparación de ejecuciones"
          subtitle="Histórico completado del proyecto. El Δ F1 se mide contra la ejecución evaluada."
          icon="queue"
          actions={<Chip tone="outline">{evaluationRuns.length} ejecuciones</Chip>}
        >
          <ComparisonTable
            runs={evaluationRuns}
            currentId={current.id}
            compareIds={compareIds}
            onSelect={selectRun}
            onToggleCompare={toggleCompare}
          />
        </Panel>

        <Panel
          title="Limitaciones y observaciones"
          subtitle="Registro acumulado por ejecución; acompaña la evaluación final y la futura versión del modelo."
          icon="report"
          actions={
            <Chip tone={unreviewed > 0 ? 'preparing' : 'completed'} dot>
              {unreviewed > 0 ? `${unreviewed} sin revisar` : 'Todo revisado'}
            </Chip>
          }
        >
          <ObservationLog
            runs={evaluationRuns}
            observations={observations}
            currentRunId={current.id}
            filter={observationFilter}
            onFilter={setObservationFilter}
            onAdd={handleAddObservation}
            onToggleReviewed={toggleReviewed}
            titleRef={titleRef}
          />
        </Panel>
      </div>
    </>
  );
}
