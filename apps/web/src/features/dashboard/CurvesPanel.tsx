import { useEffect, useMemo, useState } from 'react';
import type { EpochPoint, JobCurves, JobStatus, TrainingJob } from '@/types/domain';
import { fetchJobCurves } from '@/lib/api/dashboard';
import { formatLoss, formatNumber, formatRate } from '@/lib/format';
import { Chip, StatusChip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { LossGainChart, Trend } from '@/components/ui/DataViz';

/** Sólo los trabajos que ya corrieron publican historial de épocas; hacen falta dos para trazar. */
const PLOTTABLE: JobStatus[] = ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

function isPlottable(job: TrainingJob): boolean {
  return PLOTTABLE.includes(job.status) && job.epoch >= 2;
}

function signed(value: number, decimals = 1): string {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${prefix}${formatNumber(Math.abs(value), decimals)}`;
}

/** Resumen de la curva: cifras de convergencia y sesgo de generalización. */
function describe(points: EpochPoint[]) {
  const first = points[0];
  const last = points[points.length - 1];
  return {
    firstLoss: first.loss,
    lastLoss: last.loss,
    lossDropPct: first.loss > 0 ? ((first.loss - last.loss) / first.loss) * 100 : 0,
    gainPts: (last.accuracy - first.accuracy) * 100,
    lastVal: last.valAccuracy,
    bestVal: Math.max(...points.map((point) => point.valAccuracy)),
    gapPts: (last.valAccuracy - last.accuracy) * 100,
  };
}

export function CurvesPanel({ jobs }: { jobs: TrainingJob[] }) {
  const candidates = useMemo(() => jobs.filter(isPlottable), [jobs]);
  const [picked, setPicked] = useState('');
  const job = candidates.find((item) => item.id === picked) ?? candidates[0];

  const jobId = job?.id ?? '';
  /* Releer cuando la época avanza mantiene la curva viva sin sondeo propio. */
  const epoch = job?.epoch ?? 0;

  const [curves, setCurves] = useState<JobCurves | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    fetchJobCurves(jobId, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setCurves(next);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [jobId, epoch]);

  if (!job) {
    return (
      <Panel
        title="Pérdida y ganancia por modelo"
        subtitle="Curva de aprendizaje época a época de cada entrenamiento."
        icon="metrics"
      >
        <div className="empty">
          <Icon name="metrics" size={22} />
          <h3>Sin épocas registradas</h3>
          <p>
            Ningún trabajo del panel tiene dos épocas completadas. La curva aparece en cuanto el
            worker publica su primer lote de métricas.
          </p>
        </div>
      </Panel>
    );
  }

  const points = curves?.jobId === jobId ? curves.points : null;

  return (
    <Panel
      title="Pérdida y ganancia por modelo"
      subtitle="La pérdida converge hacia abajo en el eje izquierdo; la ganancia —exactitud del modelo— crece en el derecho."
      icon="metrics"
      actions={
        points ? (
          <div className="inline-stats">
            <span>
              <strong>{formatNumber(points.length)}</strong> épocas
            </span>
            <span>
              <strong>{formatRate(describe(points).bestVal)}</strong> pico val.
            </span>
          </div>
        ) : null
      }
    >
      <div className="curve__bar">
        <label className="curve__field">
          <span className="curve__field-label">Modelo / algoritmo</span>
          <select
            className="curve__select"
            value={job.id}
            onChange={(event) => setPicked(event.target.value)}
          >
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.architectureName} · {item.family} · {item.optimizer}
              </option>
            ))}
          </select>
        </label>
        <div className="curve__meta">
          <StatusChip status={job.status} />
          <Chip tone="outline">{job.id}</Chip>
          <Chip tone="outline">{job.datasetName}</Chip>
          <Chip tone="outline">
            lote {formatNumber(job.batch)} · {job.optimizer}
          </Chip>
        </div>
      </div>

      {failed && !points ? (
        <div className="callout callout--inline" role="alert">
          <Icon name="alertTriangle" size={18} />
          <p>
            <strong>El historial de épocas no está disponible.</strong> La curva se recuperará en el
            próximo ciclo de sincronización.
          </p>
        </div>
      ) : null}

      {!points ? (
        <div className="skeleton curve__skeleton" aria-hidden="true" />
      ) : (
        <>
          <CurveStats points={points} />
          <LossGainChart points={points} model={`${job.architectureName} · ${job.optimizer}`} />
          <p className="panel__note">
            Los puntos se leen de <code>GET /training-jobs/&#123;id&#125;/metrics</code>: el navegador
            sólo dibuja la curva y no evalúa el modelo (RN-03). Una brecha{' '}
            <em>validación − entrenamiento</em> creciente señala sobreajuste.
          </p>
        </>
      )}
    </Panel>
  );
}

function CurveStats({ points }: { points: EpochPoint[] }) {
  const summary = describe(points);
  return (
    <dl className="curve__stats">
      <div>
        <dt>Pérdida inicial</dt>
        <dd>{formatLoss(summary.firstLoss)}</dd>
      </div>
      <div>
        <dt>Pérdida final</dt>
        <dd>
          {formatLoss(summary.lastLoss)}{' '}
          <Trend direction={summary.lossDropPct > 0 ? 'down' : 'flat'}>
            {signed(-Math.abs(summary.lossDropPct))} %
          </Trend>
        </dd>
      </div>
      <div>
        <dt>Ganancia neta</dt>
        <dd>
          {signed(summary.gainPts)} <small>pts</small>
        </dd>
      </div>
      <div>
        <dt>Exactitud validación</dt>
        <dd>{formatRate(summary.lastVal)}</dd>
      </div>
      <div>
        <dt>Brecha val − ent</dt>
        <dd>
          {signed(summary.gapPts)} <small>pts</small>
        </dd>
      </div>
    </dl>
  );
}
