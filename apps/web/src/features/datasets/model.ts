import type { ChipProps } from '@/components/ui/Chip';
import { seedDatasets } from '@/lib/mock/datasets';
import type {
  DatasetAccess,
  DatasetFormat,
  DatasetPrivacy,
  DatasetRecord,
  DatasetSplit,
  DatasetStatus,
} from '@/types/dataset';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

type ChipTone = NonNullable<ChipProps['tone']>;

export interface FormatMeta {
  label: string;
  description: string;
  extensions: string[];
  accept: string;
  maxBytes: number;
}

/** Formatos admitidos y límites de carga controlada (§10 del Documento Maestro). */
export const datasetFormatMeta: Record<DatasetFormat, FormatMeta> = {
  CSV: {
    label: 'CSV',
    description: 'Tabla con cabecera y una fila por registro.',
    extensions: ['.csv'],
    accept: '.csv,text/csv',
    maxBytes: 2 * GB,
  },
  JSON: {
    label: 'JSON',
    description: 'Arreglo o líneas JSON con registros serializados.',
    extensions: ['.json', '.jsonl'],
    accept: '.json,.jsonl,application/json',
    maxBytes: 512 * MB,
  },
  NPZ: {
    label: 'NPZ',
    description: 'Arreglos NumPy comprimidos para tensores de imagen o audio.',
    extensions: ['.npz'],
    accept: '.npz',
    maxBytes: 4 * GB,
  },
  ZIP: {
    label: 'ZIP',
    description: 'Archivos de imagen o audio empaquetados, sin ejecutables.',
    extensions: ['.zip'],
    accept: '.zip',
    maxBytes: 5 * GB,
  },
};

export const datasetStatusMeta: Record<
  DatasetStatus,
  { label: string; tone: ChipTone; hint: string }
> = {
  READY: {
    label: 'Disponible',
    tone: 'completed',
    hint: 'Validado y habilitado para entrenar.',
  },
  VALIDATING: {
    label: 'Validando',
    tone: 'preparing',
    hint: 'Comprobando formato, tamaño, particiones y contenido.',
  },
  DRAFT: {
    label: 'Borrador',
    tone: 'neutral',
    hint: 'Metadatos incompletos; todavía no se puede usar en un trabajo.',
  },
  QUARANTINED: {
    label: 'Retenido',
    tone: 'failed',
    hint: 'Bloqueado por la política de contenido; pendiente de purga.',
  },
};

export type DatasetFilter = 'ALL' | DatasetStatus;

export const DATASET_FILTERS: Array<{ id: DatasetFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'READY', label: 'Disponibles' },
  { id: 'VALIDATING', label: 'Validando' },
  { id: 'DRAFT', label: 'Borradores' },
  { id: 'QUARANTINED', label: 'Retenidos' },
];

export const datasetPrivacyMeta: Record<
  DatasetPrivacy,
  { label: string; tone: ChipTone; hint: string }
> = {
  PUBLIC: { label: 'Público', tone: 'outline', hint: 'Datos abiertos para cualquier miembro.' },
  INTERNAL: {
    label: 'Interno',
    tone: 'outline',
    hint: 'Uso interno del proyecto; no se comparte fuera.',
  },
  SENSITIVE: {
    label: 'Sensible',
    tone: 'outline',
    hint: 'Datos personales o restringidos; acceso mínimo necesario.',
  },
};

export const datasetAccessMeta: Record<DatasetAccess, { label: string; hint: string }> = {
  PROJECT: {
    label: 'Equipo del proyecto',
    hint: 'Lectura para miembros; escritura para responsable e ingenieros.',
  },
  ENGINEERS: {
    label: 'Ingenieros de IA',
    hint: 'Solo ingenieros y responsable pueden leer o versionar.',
  },
  OWNER: {
    label: 'Solo responsable',
    hint: 'Acceso exclusivo del responsable del proyecto.',
  },
};

export const DATASET_LICENSES = [
  'CC BY 4.0',
  'CC BY-NC 4.0',
  'MIT',
  'Uso interno',
  'Sin licencia',
] as const;

export function formatBytes(bytes: number): string {
  if (bytes >= GB) {
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(bytes / GB)}\u00a0GB`;
  }
  if (bytes >= MB) {
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(bytes / MB)}\u00a0MB`;
  }
  if (bytes >= KB) {
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(bytes / KB)}\u00a0KB`;
  }
  return `${bytes}\u00a0B`;
}

export function formatRows(rows: number): string {
  return new Intl.NumberFormat('es-ES').format(rows);
}

export interface SplitValidation {
  total: number;
  ok: boolean;
  message: string;
}

export function validateSplit(split: DatasetSplit): SplitValidation {
  const total = split.train + split.validation + split.test;
  const values = [split.train, split.validation, split.test];
  if (values.some((value) => !Number.isFinite(value) || value < 5)) {
    return { total, ok: false, message: 'Cada partición debe tener al menos 5\u00a0%.' };
  }
  if (values.some((value) => value > 90)) {
    return { total, ok: false, message: 'Ninguna partición puede superar 90\u00a0%.' };
  }
  if (total !== 100) {
    return {
      total,
      ok: false,
      message: `Las particiones suman ${total}\u00a0%; deben sumar 100\u00a0%.`,
    };
  }
  return { total, ok: true, message: 'Particiones válidas: 100\u00a0% distribuido.' };
}

export interface DatasetCheck {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
}

/** Auditoría mostrada en la ficha; el backend repite estas comprobaciones. */
export function auditDataset(dataset: DatasetRecord): DatasetCheck[] {
  const meta = datasetFormatMeta[dataset.format];
  const split = validateSplit(dataset.split);
  const quarantined = dataset.status === 'QUARANTINED';

  return [
    {
      id: 'format',
      ok: true,
      label: 'Formato admitido',
      detail: `${meta.label} · ${meta.extensions.join(', ')}`,
    },
    {
      id: 'size',
      ok: dataset.sizeBytes <= meta.maxBytes,
      label: 'Tamaño dentro del límite',
      detail: `${formatBytes(dataset.sizeBytes)} de ${formatBytes(meta.maxBytes)}`,
    },
    {
      id: 'split',
      ok: split.ok,
      label: 'Particiones declaradas',
      detail: split.message,
    },
    {
      id: 'license',
      ok: dataset.license !== 'Sin licencia',
      label: 'Licencia declarada',
      detail: dataset.license === 'Sin licencia' ? 'Falta definir la licencia de uso.' : dataset.license,
    },
    {
      id: 'content',
      ok: !quarantined,
      label: 'Contenido seguro',
      detail: quarantined
        ? 'Se detectaron archivos ejecutables dentro del paquete.'
        : 'Sin archivos ejecutables ni rutas sospechosas.',
    },
    {
      id: 'usage',
      ok: dataset.status === 'READY',
      label: 'Habilitado para entrenar',
      detail:
        dataset.status === 'READY'
          ? 'Disponible para trabajos de M06.'
          : datasetStatusMeta[dataset.status].hint,
    },
  ];
}

export function isDatasetUsable(dataset: DatasetRecord): boolean {
  return dataset.status === 'READY' && auditDataset(dataset).every((check) => check.ok);
}

export function nextDatasetId(datasets: DatasetRecord[]): string {
  const highest = datasets.reduce((acc, dataset) => {
    const numeric = Number.parseInt(dataset.id.replace(/\D+/g, ''), 10);
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc;
  }, 1000);
  return `DS-${highest + 1}`;
}

/** Hash simulado para la ficha; en producción lo calcula el backend al recibir el archivo. */
export function checksumFor(seed: string): string {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619) >>> 0;
  }
  let output = '';
  while (output.length < 64) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    output += state.toString(16).padStart(8, '0');
  }
  return output.slice(0, 64);
}

export function datasetFileName(dataset: DatasetRecord): string {
  const base = dataset.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-v${dataset.currentVersion}${datasetFormatMeta[dataset.format].extensions[0]}`;
}

export function formatChecksum(checksum: string): string {
  return `${checksum.slice(0, 10)}…${checksum.slice(-6)}`;
}

/* ---------------------------------------------------------------- persistencia */

const STORAGE_KEY = 'neurolab.datasets.v1';

function isDatasetRecord(value: unknown): value is DatasetRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.versions) &&
    typeof candidate.split === 'object'
  );
}

/** Catálogo persistido por M05; sin store, se usa la semilla de demostración. */
export function loadDatasets(): DatasetRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDatasets;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedDatasets;
    return parsed.every(isDatasetRecord) ? (parsed as DatasetRecord[]) : seedDatasets;
  } catch {
    return seedDatasets;
  }
}

export function saveDatasets(datasets: DatasetRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
  } catch {
    /* El almacenamiento del navegador es solo una caché de la demo. */
  }
}
