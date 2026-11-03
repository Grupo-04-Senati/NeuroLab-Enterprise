/* Contratos de dominio del M01. Alineados con las entidades del §8 del
   Documento Maestro y con la máquina de estados de RN-02. */

import type { IconName } from '@/components/ui/Icon';

export type JobStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type NetworkFamily = 'FEEDFORWARD' | 'RNN' | 'CNN' | 'GAN';

export type UserRole = 'admin' | 'owner' | 'engineer' | 'reviewer' | 'reader';

export interface Actor {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  initials: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  family: NetworkFamily;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  members: number;
  lastActivityAt: string;
}

export interface TrainingJob {
  id: string;
  project: string;
  projectId: string;
  architectureName: string;
  family: NetworkFamily;
  datasetName: string;
  status: JobStatus;
  epochs: number;
  epoch: number;
  batch: number;
  optimizer: string;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  progress: number;
  queuedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  owner: string;
  cancelRequested: boolean;
}

export type AlertSeverity = 'high' | 'medium' | 'info';

export interface PlatformAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  createdAt: string;
  module: string;
}

export interface ResourceMeter {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  tone: 'ok' | 'warning' | 'danger';
}

export interface SystemHealth {
  apiStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  apiLatencyMs: number;
  workersOnline: number;
  workersExpected: number;
  queueDepth: number;
  databaseStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  storageUsedGb: number;
  storageLimitGb: number;
  meters: ResourceMeter[];
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  accent: 'indigo' | 'emerald' | 'amber' | 'violet';
  icon: IconName;
  trend: { direction: 'up' | 'down' | 'flat'; value: string };
  footnote: string;
  spark: number[];
}

/** Actividad diaria de entrenamientos y épocas consumidas (gráfica de área). */
export interface ActivityPoint {
  day: string;
  jobs: number;
  epochs: number;
}

/** Un punto de la curva de aprendizaje de un trabajo (§6 M07). */
export interface EpochPoint {
  epoch: number;
  loss: number;
  valLoss: number;
  accuracy: number;
  valAccuracy: number;
}

/** Curva de pérdida y métrica de un entrenamiento concreto. */
export interface JobCurves {
  jobId: string;
  epoch: number;
  points: EpochPoint[];
}

/** Fila de la matriz de confusión: recuento previsto por clase, más su F1. */
export interface EvaluationClassRow {
  index: number;
  label: string;
  counts: number[];
  total: number;
  f1: number;
}

export interface EvaluationMatrix {
  classes: EvaluationClassRow[];
}

export interface DashboardSnapshot {
  generatedAt: string;
  kpis: DashboardKpi[];
  activeJobs: TrainingJob[];
  queuedJobs: TrainingJob[];
  recentJobs: TrainingJob[];
  topProjects: ProjectSummary[];
  alerts: PlatformAlert[];
  health: SystemHealth;
  activity: ActivityPoint[];
}
