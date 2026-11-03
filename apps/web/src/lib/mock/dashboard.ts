import type {
  ActivityPoint,
  DashboardKpi,
  DashboardSnapshot,
  JobCurves,
  JobStatus,
  NetworkFamily,
  PlatformAlert,
  ProjectSummary,
  ResourceMeter,
  TrainingJob,
} from '@/types/domain';
import { toneForUsage } from '@/lib/format';

/**
 * Datos de demostración deterministas. Reemplazables por `GET /api/v1/dashboard`
 * sin tocar los componentes: ver `lib/api/dashboard.ts`.
 */

const BOOT_AT = Date.now();
const MINUTE = 60_000;

/** PRNG con semilla estable para que el ruido no cambie entre renders. */
function seeded(seed: string): () => number {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16_777_619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface JobSeed {
  id: string;
  project: string;
  projectId: string;
  architectureName: string;
  family: NetworkFamily;
  datasetName: string;
  status: JobStatus;
  epochs: number;
  batch: number;
  optimizer: string;
  owner: string;
  epochSeconds: number;
  baseLoss: number;
  finalLoss: number;
  baseAccuracy: number;
  finalAccuracy: number;
  /** Época inicial para trabajos ya terminados. */
  completedEpochs?: number;
  startedAgoSeconds?: number;
  endedAgoMinutes?: number;
  queuedAgoMinutes?: number;
}

const JOB_SEEDS: JobSeed[] = [
  {
    id: 'JOB-4821',
    project: 'Scoring de riesgo de fuga',
    projectId: 'PRJ-118',
    architectureName: 'dense-binary-v7',
    family: 'FEEDFORWARD',
    datasetName: 'clientes_cartera_2026.csv',
    status: 'RUNNING',
    epochs: 60,
    batch: 64,
    optimizer: 'adam',
    owner: 'A. Quispe',
    epochSeconds: 11,
    baseLoss: 0.6931,
    finalLoss: 0.1284,
    baseAccuracy: 0.512,
    finalAccuracy: 0.941,
    startedAgoSeconds: 372,
  },
  {
    id: 'JOB-4822',
    project: 'Detección de fraude transaccional',
    projectId: 'PRJ-121',
    architectureName: 'lstm-seq-256',
    family: 'RNN',
    datasetName: 'transacciones_stream_q3.csv',
    status: 'RUNNING',
    epochs: 40,
    batch: 128,
    optimizer: 'rmsprop',
    owner: 'M. Ferrer',
    epochSeconds: 27,
    baseLoss: 0.6402,
    finalLoss: 0.0611,
    baseAccuracy: 0.6112,
    finalAccuracy: 0.9812,
    startedAgoSeconds: 1408,
  },
  {
    id: 'JOB-4824',
    project: 'Visión industrial de juntas',
    projectId: 'PRJ-126',
    architectureName: 'cnn-residual-lite',
    family: 'CNN',
    datasetName: 'imagenes_linea_lote38.npz',
    status: 'PREPARING',
    epochs: 25,
    batch: 32,
    optimizer: 'sgd',
    owner: 'L. Nakamura',
    epochSeconds: 41,
    baseLoss: 1.4,
    finalLoss: 0.22,
    baseAccuracy: 0.4,
    finalAccuracy: 0.91,
    startedAgoSeconds: 34,
  },
  {
    id: 'JOB-4819',
    project: 'Síntesis de datos tabulares',
    projectId: 'PRJ-131',
    architectureName: 'wggan-gp-v3',
    family: 'GAN',
    datasetName: 'sensores_turbinas.csv',
    status: 'QUEUED',
    epochs: 100,
    batch: 256,
    optimizer: 'adam',
    owner: 'R. Solís',
    epochSeconds: 18,
    baseLoss: 0.9,
    finalLoss: 0.34,
    baseAccuracy: 0.5,
    finalAccuracy: 0.86,
    queuedAgoMinutes: 7,
  },
  {
    id: 'JOB-4808',
    project: 'Predicción de demanda eléctrica',
    projectId: 'PRJ-112',
    architectureName: 'gru-horario-v2',
    family: 'RNN',
    datasetName: 'demanda_orare_24m.csv',
    status: 'QUEUED',
    epochs: 80,
    batch: 64,
    optimizer: 'adam',
    owner: 'A. Quispe',
    epochSeconds: 9,
    baseLoss: 0.7,
    finalLoss: 0.3,
    baseAccuracy: 0.5,
    finalAccuracy: 0.89,
    queuedAgoMinutes: 21,
  },
  {
    id: 'JOB-4810',
    project: 'Scoring de riesgo de fuga',
    projectId: 'PRJ-118',
    architectureName: 'dense-binary-v6',
    family: 'FEEDFORWARD',
    datasetName: 'clientes_cartera_2026.csv',
    status: 'COMPLETED',
    epochs: 60,
    batch: 64,
    optimizer: 'adam',
    owner: 'A. Quispe',
    epochSeconds: 12,
    baseLoss: 0.6931,
    finalLoss: 0.1401,
    baseAccuracy: 0.512,
    finalAccuracy: 0.933,
    completedEpochs: 60,
    endedAgoMinutes: 42,
  },
  {
    id: 'JOB-4795',
    project: 'Clasificación de incidencias Soporte',
    projectId: 'PRJ-104',
    architectureName: 'mlp-3clases-v1',
    family: 'FEEDFORWARD',
    datasetName: 'tickets_2026.csv',
    status: 'COMPLETED',
    epochs: 45,
    batch: 32,
    optimizer: 'adam',
    owner: 'M. Ferrer',
    epochSeconds: 6,
    baseLoss: 1.0986,
    finalLoss: 0.1872,
    baseAccuracy: 0.36,
    finalAccuracy: 0.9174,
    completedEpochs: 45,
    endedAgoMinutes: 163,
  },
  {
    id: 'JOB-4790',
    project: 'Detección de fraude transaccional',
    projectId: 'PRJ-121',
    architectureName: 'lstm-seq-512',
    family: 'RNN',
    datasetName: 'transacciones_stream_q3.csv',
    status: 'FAILED',
    epochs: 40,
    batch: 128,
    optimizer: 'sgd',
    owner: 'D. Alcaántara',
    epochSeconds: 33,
    baseLoss: 0.661,
    finalLoss: 0.6608,
    baseAccuracy: 0.5011,
    finalAccuracy: 0.5032,
    completedEpochs: 12,
    endedAgoMinutes: 288,
  },
  {
    id: 'JOB-4781',
    project: 'Visión industrial de juntas',
    projectId: 'PRJ-126',
    architectureName: 'cnn-residual-full',
    family: 'CNN',
    datasetName: 'imagenes_linea_lote37.npz',
    status: 'CANCELLED',
    epochs: 120,
    batch: 16,
    optimizer: 'adam',
    owner: 'L. Nakamura',
    epochSeconds: 58,
    baseLoss: 1.2,
    finalLoss: 0.66,
    baseAccuracy: 0.42,
    finalAccuracy: 0.71,
    completedEpochs: 31,
    endedAgoMinutes: 1_440,
  },
];

/** Curva de aprendizaje: decaimiento exponencial de la pérdida con ruido estable. */
function metricsFor(seed: JobSeed, epoch: number) {
  const rand = seeded(`${seed.id}:${epoch}`);
  const t = seed.epochs > 0 ? epoch / seed.epochs : 0;
  const decay = Math.exp(-3.4 * t);
  const noise = (rand() - 0.5) * 0.022 * decay;
  const loss = Math.max(seed.finalLoss, (seed.baseLoss - seed.finalLoss) * decay + seed.finalLoss + noise);
  const accuracy = Math.min(
    seed.finalAccuracy,
    seed.finalAccuracy - (seed.finalAccuracy - seed.baseAccuracy) * decay + noise * 0.9,
  );
  const valLoss = loss * (1.04 + rand() * 0.05);
  const valAccuracy = Math.max(0.4, accuracy - 0.008 - rand() * 0.012);
  return { loss, accuracy, valLoss, valAccuracy };
}

/** Época alcanzada por el seed en el instante dado; única fuente de avance del trabajo. */
function epochReached(seed: JobSeed, now: number): number {
  if (seed.status !== 'RUNNING' && seed.status !== 'PREPARING') {
    return seed.completedEpochs ?? seed.epochs;
  }
  const elapsedSeconds = (seed.startedAgoSeconds ?? 0) + (now - BOOT_AT) / 1000;
  return Math.min(seed.epochs - 1, Math.floor(elapsedSeconds / seed.epochSeconds));
}

function toJob(seed: JobSeed): TrainingJob {
  const now = Date.now();
  const rand = seeded(seed.id);
  const active = seed.status === 'RUNNING' || seed.status === 'PREPARING';
  const epoch = epochReached(seed, now);

  const startedAt = seed.startedAgoSeconds
    ? new Date(now - (seed.startedAgoSeconds + epoch * seed.epochSeconds) * 1000).toISOString()
    : null;
  const endedAt = seed.endedAgoMinutes
    ? new Date(now - seed.endedAgoMinutes * MINUTE).toISOString()
    : null;
  const queuedAt = new Date(now - ((seed.queuedAgoMinutes ?? 0) + 3) * MINUTE).toISOString();

  const { loss, accuracy, valLoss, valAccuracy } = metricsFor(seed, Math.max(0, epoch - 1));
  const durationSeconds = active
    ? epoch * seed.epochSeconds + Math.round(rand() * 8)
    : (seed.completedEpochs ?? seed.epochs) * seed.epochSeconds;

  return {
    id: seed.id,
    project: seed.project,
    projectId: seed.projectId,
    architectureName: seed.architectureName,
    family: seed.family,
    datasetName: seed.datasetName,
    status: seed.status,
    epochs: seed.epochs,
    epoch,
    batch: seed.batch,
    optimizer: seed.optimizer,
    loss,
    accuracy,
    valLoss,
    valAccuracy,
    progress: Math.round((Math.min(epoch, seed.epochs) / seed.epochs) * 100),
    queuedAt,
    startedAt,
    endedAt,
    durationSeconds,
    owner: seed.owner,
    cancelRequested: false,
  };
}

/**
 * Curva de pérdida y métrica época a época. Los puntos salen del mismo
 * `metricsFor` que alimenta las fichas, así lectura y gráfica nunca divergen.
 */
export function buildCurves(jobId: string): JobCurves {
  const seed = JOB_SEEDS.find((item) => item.id === jobId);
  if (!seed) return { jobId, epoch: 0, points: [] };
  const epoch = epochReached(seed, Date.now());
  const points = Array.from({ length: epoch }, (_, index) => ({
    epoch: index + 1,
    ...metricsFor(seed, index),
  }));
  return { jobId, epoch, points };
}

const PROJECTS: ProjectSummary[] = [
  {
    id: 'PRJ-118',
    name: 'Scoring de riesgo de fuga',
    description: 'Clasificación binaria de clientes con probabilidad de cancelación.',
    family: 'FEEDFORWARD',
    status: 'ACTIVE',
    members: 6,
    lastActivityAt: new Date(BOOT_AT - 6 * MINUTE).toISOString(),
  },
  {
    id: 'PRJ-121',
    name: 'Detección de fraude transaccional',
    description: 'Secuencias cortas de cargo con ventana deslizante.',
    family: 'RNN',
    status: 'ACTIVE',
    members: 8,
    lastActivityAt: new Date(BOOT_AT - 19 * MINUTE).toISOString(),
  },
  {
    id: 'PRJ-126',
    name: 'Visión industrial de juntas',
    description: 'Clasificación de defectos superficiales en línea de ensamblaje.',
    family: 'CNN',
    status: 'ACTIVE',
    members: 4,
    lastActivityAt: new Date(BOOT_AT - 51 * MINUTE).toISOString(),
  },
  {
    id: 'PRJ-131',
    name: 'Síntesis de datos tabulares',
    description: 'Generación de muestras equilibradas para sensores de turbina.',
    family: 'GAN',
    status: 'DRAFT',
    members: 3,
    lastActivityAt: new Date(BOOT_AT - 3.5 * 60 * MINUTE).toISOString(),
  },
];

const ALERTS: PlatformAlert[] = [
  {
    id: 'ALR-91',
    severity: 'high',
    title: 'Worker de GPU sin respuesta',
    description: 'worker-ml-02 perdió el latido hace 4 min; JOB-4824 reencolado automáticamente.',
    createdAt: new Date(BOOT_AT - 4 * MINUTE).toISOString(),
    module: 'M06 · Entrenamientos',
  },
  {
    id: 'ALR-90',
    severity: 'medium',
    title: 'Cuota de almacenamiento al 82 %',
    description: 'El almacén de artefactos supera el umbral de aviso. Revisar versiones retiradas.',
    createdAt: new Date(BOOT_AT - 26 * MINUTE).toISOString(),
    module: 'M08 · Registro de modelos',
  },
  {
    id: 'ALR-88',
    severity: 'medium',
    title: 'Dataset sin verificación de esquema',
    description: 'sensores_turbinas.csv no registra validación de tipos y nulos (RN-01).',
    createdAt: new Date(BOOT_AT - 71 * MINUTE).toISOString(),
    module: 'M05 · Datasets',
  },
  {
    id: 'ALR-85',
    severity: 'info',
    title: 'Modelo pendiente de aprobación',
    description: 'dense-binary-v6 completó evaluación y espera revisión para publicar v1.4.',
    createdAt: new Date(BOOT_AT - 190 * MINUTE).toISOString(),
    module: 'M08 · Registro de modelos',
  },
];

function activitySeries(): ActivityPoint[] {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const rand = seeded('activity-14');
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(BOOT_AT - (13 - index) * 24 * 60 * MINUTE);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const jobs = Math.max(1, Math.round((weekend ? 3 : 11) + rand() * (weekend ? 3 : 9)));
    return {
      day: index % 2 === 0 ? days[(date.getDay() + 6) % 7] : '',
      jobs,
      epochs: Math.round(jobs * (7 + rand() * 16)),
    };
  });
}

function metersFor(health: { storageUsedGb: number; storageLimitGb: number }): ResourceMeter[] {
  const base = [
    { id: 'cpu', label: 'CPU agregada', used: 61, limit: 100, unit: '%' },
    { id: 'mem', label: 'Memoria de workers', used: 43.8, limit: 64, unit: 'GB' },
    { id: 'gpu', label: 'Cola de GPU', used: 3, limit: 4, unit: 'sdos.' },
  ];
  const storage = {
    id: 'storage',
    label: 'Almacén de artefactos',
    used: health.storageUsedGb,
    limit: health.storageLimitGb,
    unit: 'GB',
  };
  return [...base, storage].map((meter) => ({
    ...meter,
    tone: toneForUsage(meter.used / meter.limit),
  }));
}

export function buildSnapshot(): DashboardSnapshot {
  const jobs = JOB_SEEDS.map(toJob);
  const activeJobs = jobs.filter((job) => job.status === 'RUNNING' || job.status === 'PREPARING');
  const queuedJobs = jobs.filter((job) => job.status === 'QUEUED');
  const recentJobs = jobs
    .filter((job) => job.status !== 'RUNNING' && job.status !== 'PREPARING' && job.status !== 'QUEUED')
    .sort((a, b) => new Date(b.endedAt ?? 0).getTime() - new Date(a.endedAt ?? 0).getTime());

  const healthBase = {
    apiStatus: 'HEALTHY' as const,
    apiLatencyMs: 84,
    workersOnline: 5,
    workersExpected: 6,
    queueDepth: queuedJobs.length + 1,
    databaseStatus: 'HEALTHY' as const,
    storageUsedGb: 984.6,
    storageLimitGb: 1200,
  };

  const health = { ...healthBase, meters: metersFor(healthBase) };

  const kpis: DashboardKpi[] = [
    {
      id: 'projects',
      label: 'Proyectos activos',
      value: PROJECTS.filter((project) => project.status === 'ACTIVE').length,
      accent: 'indigo' as const,
      icon: 'projects',
      trend: { direction: 'up' as const, value: '+2 este mes' },
      footnote: `${PROJECTS.length} en total · 3 familias de red`,
      spark: [7, 8, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 13, 14],
    },
    {
      id: 'runs',
      label: 'Entrenamientos en ejecución',
      value: activeJobs.length,
      accent: 'violet' as const,
      icon: 'training',
      trend: { direction: 'up' as const, value: `+${queuedJobs.length} en cola` },
      footnote: `${health.workersOnline}/${health.workersExpected} workers disponibles`,
      spark: [1, 2, 2, 3, 2, 4, 3, 5, 4, 3, 4, 3, 3, activeJobs.length],
    },
    {
      id: 'models',
      label: 'Modelos publicados',
      value: 27,
      accent: 'emerald' as const,
      icon: 'model',
      trend: { direction: 'up' as const, value: '+4 en 30 días' },
      footnote: 'Versiones inmutables trazables (RN-04)',
      spark: [18, 19, 20, 21, 21, 22, 23, 24, 24, 25, 26, 26, 27, 27],
    },
    {
      id: 'accuracy',
      label: 'Mejor accuracy validada',
      value: 98.12,
      decimals: 2,
      unit: '%',
      accent: 'amber' as const,
      icon: 'metrics',
      trend: { direction: 'down' as const, value: '−0,4 pts vs. trabajo previo' },
      footnote: 'JOB-4822 · lstm-seq-256 sobre stream Q3',
      spark: [96.4, 96.8, 97.1, 97.6, 97.9, 98.4, 98.6, 98.5, 98.9, 98.7, 98.5, 98.3, 98.2, 98.12],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    activeJobs,
    queuedJobs,
    recentJobs,
    topProjects: PROJECTS,
    alerts: ALERTS,
    health,
    activity: activitySeries(),
  } satisfies DashboardSnapshot;
}
