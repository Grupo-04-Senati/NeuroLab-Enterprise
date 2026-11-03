/* Datos demo del M07. Las curvas se generan de forma determinista para que la
   demo sea reproducible; en producción el historial llega del worker del M06. */

import type {
  EpochMetrics,
  EvaluationClass,
  EvaluationRun,
  Observation,
} from '@/types/evaluation';

/** Espacio de etiquetas compartido por las ejecuciones del proyecto de acero. */
export const evaluationClasses: EvaluationClass[] = [
  { id: 'normal', label: 'Normal', short: 'Normal' },
  { id: 'fisura', label: 'Fisura', short: 'Fisura' },
  { id: 'corrosion', label: 'Corrosión', short: 'Corrosión' },
  { id: 'desgaste', label: 'Desgaste', short: 'Desgaste' },
];

interface CurveOptions {
  epochs: number;
  startLoss: number;
  endLoss: number;
  valLossGap: number;
  overfitLoss: number;
  startAccuracy: number;
  endAccuracy: number;
  valAccuracyGap: number;
  overfitAccuracy: number;
  seed: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;
const clampAccuracy = (value: number) => Math.min(0.994, Math.max(0.3, value));

function buildHistory(options: CurveOptions): EpochMetrics[] {
  const {
    epochs,
    startLoss,
    endLoss,
    valLossGap,
    overfitLoss,
    startAccuracy,
    endAccuracy,
    valAccuracyGap,
    overfitAccuracy,
    seed,
  } = options;

  return Array.from({ length: epochs }, (_, index) => {
    const epoch = index + 1;
    const t = epochs > 1 ? index / (epochs - 1) : 1;

    const lossDecay = Math.exp(-5.4 * t);
    const lossWobble = Math.sin(index * 0.83 + seed) * 0.035 * (1 - 0.85 * t);
    const loss = round3(Math.max(0.012, endLoss + (startLoss - endLoss) * lossDecay * (1 + lossWobble)));

    const late = Math.max(0, (t - 0.7) / 0.3);
    const lateEase = late * late * (3 - 2 * late);
    const valLoss = round3(
      Math.max(0.02, loss + valLossGap + overfitLoss * lateEase + Math.sin(index * 1.21 + seed) * 0.003),
    );

    const accuracyDecay = Math.exp(-5.2 * t);
    const accuracy = round4(
      clampAccuracy(
        endAccuracy - (endAccuracy - startAccuracy) * accuracyDecay + Math.sin(index * 0.71 + seed) * 0.004 * (1 - t),
      ),
    );
    const valAccuracy = round4(
      clampAccuracy(
        accuracy - valAccuracyGap - overfitAccuracy * lateEase + Math.sin(index * 1.09 + seed) * 0.003 * (1 - t),
      ),
    );

    const f1 = round4(Math.max(0, accuracy - 0.006 - 0.004 * (1 - t)));
    const valF1 = round4(Math.max(0, valAccuracy - 0.008));

    return { epoch, loss, valLoss, accuracy, valAccuracy, f1, valF1 };
  });
}

/** Ejecuciones completadas del proyecto, de la más reciente a la más antigua. */
export const evaluationRuns: EvaluationRun[] = [
  {
    id: 'EV-1042',
    jobId: 'TR-2087',
    name: 'Defectos v4 · CNN profunda',
    project: 'Detección de defectos en acero',
    dataset: 'Acero laminado · líneas 1-3',
    datasetVersion: 'v3.2',
    family: 'CNN',
    architecture: 'CNN-Deep v4',
    optimizer: 'AdamW',
    learningRate: 0.0008,
    batchSize: 32,
    seed: 42,
    epochs: 42,
    bestEpoch: 34,
    durationSeconds: 18_420,
    finishedAt: '2026-10-28T16:40:00Z',
    status: 'COMPLETED',
    split: 'TEST',
    samples: 1200,
    testLoss: 0.081,
    latencyP95Ms: 38,
    confusion: [
      [462, 6, 7, 5],
      [5, 280, 9, 6],
      [6, 10, 212, 12],
      [3, 4, 8, 165],
    ],
    tone: 'indigo',
    history: buildHistory({
      epochs: 42,
      startLoss: 2.08,
      endLoss: 0.041,
      valLossGap: 0.036,
      overfitLoss: 0.014,
      startAccuracy: 0.4,
      endAccuracy: 0.971,
      valAccuracyGap: 0.012,
      overfitAccuracy: 0.004,
      seed: 1.3,
    }),
  },
  {
    id: 'EV-1038',
    jobId: 'TR-2079',
    name: 'Defectos v3 · ResNet-34',
    project: 'Detección de defectos en acero',
    dataset: 'Acero laminado · líneas 1-3',
    datasetVersion: 'v2.4',
    family: 'CNN',
    architecture: 'ResNet-34',
    optimizer: 'AdamW',
    learningRate: 0.001,
    batchSize: 64,
    seed: 41,
    epochs: 36,
    bestEpoch: 29,
    durationSeconds: 21_240,
    finishedAt: '2026-10-27T19:05:00Z',
    status: 'COMPLETED',
    split: 'TEST',
    samples: 1200,
    testLoss: 0.094,
    latencyP95Ms: 45,
    confusion: [
      [458, 7, 9, 6],
      [6, 274, 12, 8],
      [8, 10, 208, 14],
      [4, 5, 11, 160],
    ],
    tone: 'sky',
    history: buildHistory({
      epochs: 36,
      startLoss: 2.16,
      endLoss: 0.054,
      valLossGap: 0.04,
      overfitLoss: 0.012,
      startAccuracy: 0.38,
      endAccuracy: 0.962,
      valAccuracyGap: 0.016,
      overfitAccuracy: 0.005,
      seed: 2.7,
    }),
  },
  {
    id: 'EV-1031',
    jobId: 'TR-2064',
    name: 'Defectos v2 · CNN base',
    project: 'Detección de defectos en acero',
    dataset: 'Acero laminado · líneas 1-3',
    datasetVersion: 'v2.4',
    family: 'CNN',
    architecture: 'CNN-Base',
    optimizer: 'SGD · momentum 0,9',
    learningRate: 0.01,
    batchSize: 64,
    seed: 40,
    epochs: 28,
    bestEpoch: 22,
    durationSeconds: 14_360,
    finishedAt: '2026-10-26T11:32:00Z',
    status: 'COMPLETED',
    split: 'TEST',
    samples: 1200,
    testLoss: 0.121,
    latencyP95Ms: 31,
    confusion: [
      [445, 14, 13, 8],
      [12, 252, 22, 14],
      [14, 17, 190, 19],
      [6, 9, 16, 149],
    ],
    tone: 'emerald',
    history: buildHistory({
      epochs: 28,
      startLoss: 2.24,
      endLoss: 0.074,
      valLossGap: 0.047,
      overfitLoss: 0.006,
      startAccuracy: 0.36,
      endAccuracy: 0.938,
      valAccuracyGap: 0.02,
      overfitAccuracy: 0.003,
      seed: 4.1,
    }),
  },
  {
    id: 'EV-1019',
    jobId: 'TR-2041',
    name: 'Defectos v1 · Feedforward 512',
    project: 'Detección de defectos en acero',
    dataset: 'Acero laminado · líneas 1-3',
    datasetVersion: 'v1.8',
    family: 'FEEDFORWARD',
    architecture: 'FF-512',
    optimizer: 'Adam',
    learningRate: 0.0015,
    batchSize: 128,
    seed: 39,
    epochs: 24,
    bestEpoch: 17,
    durationSeconds: 9_540,
    finishedAt: '2026-10-24T09:18:00Z',
    status: 'COMPLETED',
    split: 'TEST',
    samples: 1200,
    testLoss: 0.168,
    latencyP95Ms: 19,
    confusion: [
      [430, 22, 17, 11],
      [20, 230, 30, 20],
      [22, 24, 172, 22],
      [12, 14, 20, 134],
    ],
    tone: 'amber',
    history: buildHistory({
      epochs: 24,
      startLoss: 2.42,
      endLoss: 0.132,
      valLossGap: 0.036,
      overfitLoss: 0.003,
      startAccuracy: 0.33,
      endAccuracy: 0.905,
      valAccuracyGap: 0.023,
      overfitAccuracy: 0.002,
      seed: 5.6,
    }),
  },
];

export const defaultEvaluationRunId = evaluationRuns[0].id;

/** Registro inicial de limitaciones y observaciones (§6 M07). */
export const seedObservations: Observation[] = [
  {
    id: 'OB-3021',
    runId: 'EV-1042',
    kind: 'LIMITATION',
    title: 'Comparación entre particiones v2 y v3',
    body: 'EV-1019 y EV-1031 se evaluaron con la partición v2.4, mientras EV-1042 usa v3.2. Las diferencias de F1 no son estrictamente comparables entre esas versiones.',
    author: 'Camila Rojas',
    createdAt: '2026-10-28T17:20:00Z',
    reviewed: false,
  },
  {
    id: 'OB-3020',
    runId: 'EV-1042',
    kind: 'OBSERVATION',
    title: 'Mejor F1 en la época 34',
    body: 'Después de la época 34 la pérdida de validación repunta mientras la de entrenamiento sigue bajando. El modelo registrado debe ser el checkpoint 34, no el último.',
    author: 'Diego Salas',
    createdAt: '2026-10-28T17:02:00Z',
    reviewed: true,
  },
  {
    id: 'OB-3019',
    runId: 'EV-1042',
    kind: 'RISK',
    title: 'Falsos negativos en fisuras finas',
    body: 'El 63 % de los falsos negativos de Fisura corresponden a grietas menores de 2 mm. Revisar el umbral de la cámara y ampliar el subconjunto con imágenes de aumento.',
    author: 'Camila Rojas',
    createdAt: '2026-10-28T16:58:00Z',
    reviewed: false,
  },
  {
    id: 'OB-3016',
    runId: 'EV-1038',
    kind: 'LIMITATION',
    title: 'Corrosión infrarrepresentada en el lote 12',
    body: 'El lote 12 de la partición v2.4 contiene menos muestras de Corrosión de lo declarado. Conviene reequilibrar ese lote antes de la siguiente evaluación.',
    author: 'Diego Salas',
    createdAt: '2026-10-27T19:40:00Z',
    reviewed: false,
  },
  {
    id: 'OB-3011',
    runId: 'EV-1031',
    kind: 'OBSERVATION',
    title: 'Latencia por debajo del objetivo',
    body: 'CNN-Base mantiene 31 ms p95 con lote 64, pero su F1 macro queda 7,7 puntos por debajo de EV-1042. No se recomienda como candidata a producción.',
    author: 'Valeria Ríos',
    createdAt: '2026-10-26T12:05:00Z',
    reviewed: true,
  },
];
