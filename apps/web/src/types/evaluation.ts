/* Contratos del M07 · Evaluación y métricas. La partición de prueba queda
   reservada desde el M05 y sólo se consume aquí para la evaluación final (§6). */

import type { JobStatus, NetworkFamily } from '@/types/domain';

export type EvaluationMetric = 'loss' | 'accuracy' | 'f1';

export type EvaluationSplit = 'TEST' | 'VALIDATION';

export type ObservationKind = 'LIMITATION' | 'OBSERVATION' | 'RISK';

export type RunTone = 'indigo' | 'sky' | 'emerald' | 'amber';

/** Etiqueta supervisada del proyecto de clasificación evaluado. */
export interface EvaluationClass {
  id: string;
  label: string;
  /** Abreviatura para encabezados de la matriz de confusión. */
  short: string;
}

/** Métricas por época reportadas por el worker durante el M06. */
export interface EpochMetrics {
  epoch: number;
  loss: number;
  valLoss: number;
  accuracy: number;
  valAccuracy: number;
  f1: number;
  valF1: number;
}

/** Métricas agregadas de una clase a partir de la matriz de confusión. */
export interface ClassMetrics {
  classId: string;
  support: number;
  predicted: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvaluationSummary {
  total: number;
  accuracy: number;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  weakestClassId: string;
}

/** Ejecución de entrenamiento con evaluación final sobre la partición de prueba. */
export interface EvaluationRun {
  id: string;
  jobId: string;
  name: string;
  project: string;
  dataset: string;
  datasetVersion: string;
  family: NetworkFamily;
  architecture: string;
  optimizer: string;
  learningRate: number;
  batchSize: number;
  seed: number;
  epochs: number;
  bestEpoch: number;
  durationSeconds: number;
  finishedAt: string;
  status: JobStatus;
  split: EvaluationSplit;
  samples: number;
  testLoss: number;
  latencyP95Ms: number;
  /** Filas = clase real; columnas = clase predicha. */
  confusion: number[][];
  history: EpochMetrics[];
  tone: RunTone;
}

export interface Observation {
  id: string;
  runId: string;
  kind: ObservationKind;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  reviewed: boolean;
}

export interface ObservationDraft {
  runId: string;
  kind: ObservationKind;
  title: string;
  body: string;
}
