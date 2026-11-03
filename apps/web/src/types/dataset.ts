/* Contratos del M05 · Datasets. Los archivos viven en almacenamiento de objetos;
   la API y la base de datos solo conservan metadatos y versiones trazables (§8). */

export type DatasetFormat = 'CSV' | 'JSON' | 'NPZ' | 'ZIP';

export type DatasetStatus = 'READY' | 'VALIDATING' | 'DRAFT' | 'QUARANTINED';

export type DatasetPrivacy = 'PUBLIC' | 'INTERNAL' | 'SENSITIVE';

/** Alcance de lectura/escritura declarado para el dataset. */
export type DatasetAccess = 'PROJECT' | 'ENGINEERS' | 'OWNER';

export interface DatasetSplit {
  train: number;
  validation: number;
  test: number;
}

export interface DatasetVersion {
  version: number;
  createdAt: string;
  author: string;
  sizeBytes: number;
  rows: number;
  status: DatasetStatus;
  note: string;
  /** SHA-256 simulado; en producción lo calcula el backend al recibir el archivo. */
  checksum: string;
}

export interface DatasetRecord {
  id: string;
  name: string;
  projectId: string;
  project: string;
  format: DatasetFormat;
  description: string;
  tags: string[];
  license: string;
  privacy: DatasetPrivacy;
  access: DatasetAccess;
  status: DatasetStatus;
  currentVersion: number;
  versions: DatasetVersion[];
  split: DatasetSplit;
  rows: number;
  sizeBytes: number;
  updatedAt: string;
  owner: string;
}

export interface DatasetProject {
  id: string;
  name: string;
}
