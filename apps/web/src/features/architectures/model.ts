/* Modelo del M04 · Diseñador de arquitecturas.
   Capas, formas, parámetros, validación y plantillas por familia de red. */

import type { NetworkFamily } from '@/types/domain';

export type Activation = 'relu' | 'tanh' | 'sigmoid' | 'softmax' | 'linear' | 'gelu';

export type LayerType =
  | 'Dense'
  | 'Dropout'
  | 'BatchNormalization'
  | 'Conv2D'
  | 'MaxPooling2D'
  | 'Flatten'
  | 'LSTM'
  | 'GRU';

export interface LayerConfig {
  id: string;
  type: LayerType;
  units?: number;
  filters?: number;
  kernelSize?: number;
  poolSize?: number;
  dropout?: number;
  activation?: Activation;
}

export interface InputConfig {
  features: number;
  timesteps: number;
  seqFeatures: number;
  height: number;
  width: number;
  channels: number;
  latent: number;
}

export interface NeuronRef {
  layer: number;
  neuron: number;
}

export interface NeuronConnection {
  id: string;
  from: NeuronRef;
  to: NeuronRef;
}

export interface ArchitectureConfig {
  name: string;
  family: NetworkFamily;
  input: InputConfig;
  layers: LayerConfig[];
  connections: NeuronConnection[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ArchitectureIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  layerId?: string;
}

export interface LayerResult {
  index: number;
  layer: LayerConfig;
  inputShape: number[];
  outputShape: number[];
  params: number;
}

export interface ArchitectureComputation {
  inputShape: number[];
  outputShape: number[];
  results: LayerResult[];
  totalParams: number;
  issues: ArchitectureIssue[];
  connections: NeuronConnection[];
  neuronCounts: number[];
}

/** Neuronas visibles por capa en el lienzo (el resto se resume con «+N»). */
export const MAX_VISIBLE_NEURONS = 6;

export const ACTIVATION_OPTIONS: Array<{ value: Activation; label: string }> = [
  { value: 'relu', label: 'ReLU' },
  { value: 'gelu', label: 'GELU' },
  { value: 'tanh', label: 'Tanh' },
  { value: 'sigmoid', label: 'Sigmoide' },
  { value: 'softmax', label: 'Softmax' },
  { value: 'linear', label: 'Lineal' },
];

interface LayerTypeInfo {
  label: string;
  hint: string;
  defaults: Omit<LayerConfig, 'id' | 'type'>;
}

export const layerCatalog: Record<LayerType, LayerTypeInfo> = {
  Dense: {
    label: 'Dense',
    hint: 'Capa totalmente conectada',
    defaults: { units: 64, activation: 'relu' },
  },
  Dropout: {
    label: 'Dropout',
    hint: 'Regularización por descarte',
    defaults: { dropout: 0.2 },
  },
  BatchNormalization: {
    label: 'BatchNorm',
    hint: 'Normaliza las activaciones',
    defaults: {},
  },
  Conv2D: {
    label: 'Conv2D',
    hint: 'Convolución sobre imágenes',
    defaults: { filters: 32, kernelSize: 3, activation: 'relu' },
  },
  MaxPooling2D: {
    label: 'MaxPool',
    hint: 'Reduce la resolución espacial',
    defaults: { poolSize: 2 },
  },
  Flatten: {
    label: 'Flatten',
    hint: 'Aplana la salida a un vector',
    defaults: {},
  },
  LSTM: {
    label: 'LSTM',
    hint: 'Memoria para secuencias',
    defaults: { units: 64, activation: 'tanh' },
  },
  GRU: {
    label: 'GRU',
    hint: 'Memoria compacta para secuencias',
    defaults: { units: 64, activation: 'tanh' },
  },
};

export interface FamilyInfo {
  id: NetworkFamily;
  label: string;
  glyph: string;
  description: string;
  allowed: LayerType[];
}

export const FAMILIES: FamilyInfo[] = [
  {
    id: 'FEEDFORWARD',
    label: 'Feedforward',
    glyph: 'FF',
    description: 'Capas densas apiladas para clasificación tabular.',
    allowed: ['Dense', 'Dropout', 'BatchNormalization'],
  },
  {
    id: 'RNN',
    label: 'Recurrente',
    glyph: 'RNN',
    description: 'Secuencias con memoria mediante LSTM o GRU.',
    allowed: ['LSTM', 'GRU', 'Dense', 'Dropout', 'BatchNormalization'],
  },
  {
    id: 'CNN',
    label: 'Convolucional',
    glyph: 'CNN',
    description: 'Filtros y pooling para imágenes y señales 2D.',
    allowed: ['Conv2D', 'MaxPooling2D', 'Flatten', 'Dense', 'Dropout', 'BatchNormalization'],
  },
  {
    id: 'GAN',
    label: 'GAN',
    glyph: 'GAN',
    description: 'Generador denso que compite con un discriminador.',
    allowed: ['Dense', 'Dropout', 'BatchNormalization'],
  },
];

export const familyById = Object.fromEntries(FAMILIES.map((family) => [family.id, family])) as Record<
  NetworkFamily,
  FamilyInfo
>;

const uid = (): string => Math.random().toString(36).slice(2, 10);

export const createConnectionId = uid;

export function createLayer(type: LayerType): LayerConfig {
  return { id: uid(), type, ...layerCatalog[type].defaults };
}

function defaultInput(): InputConfig {
  return {
    features: 784,
    timesteps: 50,
    seqFeatures: 16,
    height: 64,
    width: 64,
    channels: 3,
    latent: 100,
  };
}

function templateLayers(family: NetworkFamily): LayerConfig[] {
  const make = (type: LayerType, patch: Partial<LayerConfig> = {}): LayerConfig => ({
    ...createLayer(type),
    ...patch,
  });

  switch (family) {
    case 'RNN':
      return [
        make('LSTM', { units: 64 }),
        make('Dropout', { dropout: 0.2 }),
        make('Dense', { units: 32 }),
        make('Dense', { units: 10, activation: 'softmax' }),
      ];
    case 'CNN':
      return [
        make('Conv2D', { filters: 32, kernelSize: 3 }),
        make('MaxPooling2D', { poolSize: 2 }),
        make('Conv2D', { filters: 64, kernelSize: 3 }),
        make('MaxPooling2D', { poolSize: 2 }),
        make('Flatten'),
        make('Dense', { units: 64 }),
        make('Dense', { units: 10, activation: 'softmax' }),
      ];
    case 'GAN':
      return [
        make('Dense', { units: 128 }),
        make('Dense', { units: 256 }),
        make('Dense', { units: 784, activation: 'sigmoid' }),
      ];
    case 'FEEDFORWARD':
    default:
      return [
        make('Dense', { units: 64 }),
        make('Dropout', { dropout: 0.2 }),
        make('Dense', { units: 32 }),
        make('Dense', { units: 10, activation: 'softmax' }),
      ];
  }
}

const TEMPLATE_NAMES: Record<NetworkFamily, string> = {
  FEEDFORWARD: 'Clasificador feedforward',
  RNN: 'Pronóstico de secuencias',
  CNN: 'Clasificador de imágenes',
  GAN: 'Generador sintético',
};

export function createTemplate(family: NetworkFamily): ArchitectureConfig {
  return {
    name: TEMPLATE_NAMES[family],
    family,
    input: defaultInput(),
    layers: templateLayers(family),
    connections: [],
  };
}

export function countNeurons(layer: LayerConfig): number {
  switch (layer.type) {
    case 'Dense':
    case 'LSTM':
    case 'GRU':
      return Math.max(0, Math.round(layer.units ?? 0));
    case 'Conv2D':
      return Math.max(0, Math.round(layer.filters ?? 0));
    default:
      return 1;
  }
}

export function layerTitle(layer: LayerConfig): string {
  return layerCatalog[layer.type].label;
}

export function layerSummary(layer: LayerConfig): string {
  switch (layer.type) {
    case 'Dense':
    case 'LSTM':
    case 'GRU':
      return `${layer.units ?? 0} unidades · ${layer.activation ?? 'sin activación'}`;
    case 'Conv2D':
      return `${layer.filters ?? 0} filtros · kernel ${layer.kernelSize ?? 3}×${layer.kernelSize ?? 3}`;
    case 'MaxPooling2D':
      return `pool ${layer.poolSize ?? 2}×${layer.poolSize ?? 2}`;
    case 'Dropout':
      return `descarte ${Math.round((layer.dropout ?? 0) * 100)} %`;
    case 'Flatten':
      return 'vector 1D';
    case 'BatchNormalization':
      return 'normaliza activaciones';
  }
}

export function formatShape(shape: number[]): string {
  if (!shape.length) return '—';
  return shape.map((value) => Math.max(0, Math.round(value))).join(' × ');
}

export function formatParams(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('es-PE');
}

function shapeSize(shape: number[]): number {
  return shape.reduce((acc, value) => acc * Math.max(0, value), 1);
}

function applyLayer(layer: LayerConfig, shape: number[]): { shape: number[]; params: number } {
  switch (layer.type) {
    case 'Dense': {
      const units = Math.max(0, Math.round(layer.units ?? 0));
      const inDim = shapeSize(shape);
      return { shape: [units], params: inDim * units + units };
    }
    case 'Conv2D': {
      if (shape.length !== 3) return { shape, params: 0 };
      const filters = Math.max(0, Math.round(layer.filters ?? 0));
      const kernel = Math.max(1, Math.round(layer.kernelSize ?? 3));
      const inChannels = Math.max(0, shape[2]);
      return {
        shape: [shape[0], shape[1], filters],
        params: kernel * kernel * inChannels * filters + filters,
      };
    }
    case 'MaxPooling2D': {
      if (shape.length !== 3) return { shape, params: 0 };
      const pool = Math.max(1, Math.round(layer.poolSize ?? 2));
      return {
        shape: [Math.ceil(shape[0] / pool), Math.ceil(shape[1] / pool), shape[2]],
        params: 0,
      };
    }
    case 'Flatten': {
      if (shape.length <= 1) return { shape, params: 0 };
      return { shape: [shapeSize(shape)], params: 0 };
    }
    case 'LSTM':
    case 'GRU': {
      const units = Math.max(0, Math.round(layer.units ?? 0));
      const features = Math.max(0, shape[shape.length - 1] ?? 0);
      const gates = layer.type === 'LSTM' ? 4 : 3;
      return { shape: [units], params: gates * ((features + units) * units + units) };
    }
    case 'BatchNormalization':
      return { shape, params: 2 * shapeSize(shape) };
    case 'Dropout':
    default:
      return { shape, params: 0 };
  }
}

function validateLayer(layer: LayerConfig, index: number, issues: ArchitectureIssue[]): void {
  const push = (severity: IssueSeverity, message: string, key: string) =>
    issues.push({ id: `layer-${index}-${key}`, severity, message, layerId: layer.id });

  if (layer.type === 'Dense' || layer.type === 'LSTM' || layer.type === 'GRU') {
    if (!layer.units || layer.units <= 0) {
      push('error', 'Define unidades mayores que cero para esta capa.', 'units');
    }
  }

  if (layer.type === 'Conv2D') {
    if (!layer.filters || layer.filters <= 0) {
      push('error', 'La capa Conv2D necesita al menos un filtro.', 'filters');
    }
    if (!layer.kernelSize || layer.kernelSize <= 0) {
      push('error', 'El tamaño de kernel debe ser mayor que cero.', 'kernel');
    }
  }

  if (layer.type === 'MaxPooling2D' && (!layer.poolSize || layer.poolSize <= 0)) {
    push('error', 'El tamaño de pool debe ser mayor que cero.', 'pool');
  }

  if (layer.type === 'Dropout') {
    const rate = layer.dropout ?? 0;
    if (rate < 0 || rate >= 1) {
      push('error', 'La tasa de descarte debe estar entre 0 y 0.99.', 'dropout');
    } else if (rate === 0) {
      push('warning', 'Una tasa de descarte de 0 % no regulariza la red.', 'dropout-idle');
    } else if (rate > 0.6) {
      push('warning', 'Una tasa superior al 60 % puede frenar el aprendizaje.', 'dropout-high');
    }
  }
}

function positiveDimension(value: number, label: string, issues: ArchitectureIssue[]): number {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push({
      id: `input-${label}`,
      severity: 'error',
      message: `La dimensión «${label}» debe ser mayor que cero.`,
    });
    return 1;
  }
  return Math.round(value);
}

function resolveInputShape(config: ArchitectureConfig, issues: ArchitectureIssue[]): number[] {
  const { family, input } = config;
  switch (family) {
    case 'RNN':
      return [
        positiveDimension(input.timesteps, 'pasos temporales', issues),
        positiveDimension(input.seqFeatures, 'características por paso', issues),
      ];
    case 'CNN':
      return [
        positiveDimension(input.height, 'alto', issues),
        positiveDimension(input.width, 'ancho', issues),
        positiveDimension(input.channels, 'canales', issues),
      ];
    case 'GAN':
      return [positiveDimension(input.latent, 'vector latente', issues)];
    case 'FEEDFORWARD':
    default:
      return [positiveDimension(input.features, 'características', issues)];
  }
}

export function computeArchitecture(config: ArchitectureConfig): ArchitectureComputation {
  const issues: ArchitectureIssue[] = [];
  const inputShape = resolveInputShape(config, issues);
  const results: LayerResult[] = [];
  let shape = inputShape;
  let totalParams = 0;

  config.layers.forEach((layer, index) => {
    validateLayer(layer, index, issues);

    if (layer.type === 'Dense' && config.family === 'CNN' && shape.length > 1) {
      issues.push({
        id: `layer-${index}-flatten`,
        severity: 'error',
        layerId: layer.id,
        message: 'En CNN, añade Flatten antes de la primera capa Dense.',
      });
    }
    if (layer.type === 'Conv2D' && shape.length !== 3) {
      issues.push({
        id: `layer-${index}-conv-shape`,
        severity: 'error',
        layerId: layer.id,
        message: 'Conv2D requiere una entrada 2D con forma alto × ancho × canales.',
      });
    }
    if (layer.type === 'MaxPooling2D' && shape.length !== 3) {
      issues.push({
        id: `layer-${index}-pool-shape`,
        severity: 'error',
        layerId: layer.id,
        message: 'MaxPooling2D requiere una entrada 2D con forma alto × ancho × canales.',
      });
    }
    if ((layer.type === 'LSTM' || layer.type === 'GRU') && shape.length > 2) {
      issues.push({
        id: `layer-${index}-seq-shape`,
        severity: 'error',
        layerId: layer.id,
        message: 'LSTM y GRU esperan una secuencia con forma pasos × características.',
      });
    }

    const before = shape;
    const step = applyLayer(layer, shape);
    shape = step.shape;
    totalParams += step.params;
    results.push({
      index,
      layer,
      inputShape: before,
      outputShape: step.shape,
      params: step.params,
    });
  });

  if (config.layers.length === 0) {
    issues.push({
      id: 'layers-empty',
      severity: 'error',
      message: 'Añade al menos una capa para definir la arquitectura.',
    });
  } else {
    const first = config.layers[0];
    if (config.family === 'RNN') {
      if (first.type !== 'LSTM' && first.type !== 'GRU') {
        issues.push({
          id: 'family-first',
          severity: 'warning',
          layerId: first.id,
          message: 'Una red recurrente suele iniciar con LSTM o GRU.',
        });
      }
    } else {
      const expected: LayerType =
        config.family === 'CNN' ? 'Conv2D' : 'Dense';
      if (first.type !== expected) {
        issues.push({
          id: 'family-first',
          severity: 'warning',
          layerId: first.id,
          message:
            config.family === 'CNN'
              ? 'Una CNN suele iniciar con Conv2D sobre la imagen de entrada.'
              : 'La primera capa suele ser Dense con la dimensión de entrada.',
        });
      }
    }

    const last = results[results.length - 1];
    if (last.layer.type !== 'Dense') {
      issues.push({
        id: 'output-layer',
        severity: 'error',
        layerId: last.layer.id,
        message: 'La capa final debe ser Dense para producir la salida del modelo.',
      });
    } else if (!['softmax', 'sigmoid', 'linear'].includes(last.layer.activation ?? '')) {
      issues.push({
        id: 'output-activation',
        severity: 'warning',
        layerId: last.layer.id,
        message: 'La activación de salida suele ser softmax, sigmoide o lineal.',
      });
    }
  }

  const neuronCounts = config.layers.map(countNeurons);
  const connections = config.connections.filter((connection) => {
    const fromCount = Math.min(neuronCounts[connection.from.layer] ?? 0, MAX_VISIBLE_NEURONS);
    const toCount = Math.min(neuronCounts[connection.to.layer] ?? 0, MAX_VISIBLE_NEURONS);
    const adjacent = Math.abs(connection.from.layer - connection.to.layer) === 1;
    return (
      adjacent &&
      connection.from.neuron >= 0 &&
      connection.from.neuron < fromCount &&
      connection.to.neuron >= 0 &&
      connection.to.neuron < toCount
    );
  });

  return {
    inputShape,
    outputShape: results.length ? results[results.length - 1].outputShape : inputShape,
    results,
    totalParams,
    issues,
    connections,
    neuronCounts,
  };
}

/* ---------------------------------------------------------------- borrador activo */

const DRAFT_KEY = 'neurolab.architectures.draft.v1';

/** Clave del borrador activo; la usa M04 para escribir y M09 para leer el resumen. */
export const ARCHITECTURE_DRAFT_KEY = DRAFT_KEY;

/**
 * Borrador que el diseñador (M04) tiene abierto. No es un catálogo versionado: el informe
 * lo muestra como dato del diseñador, nunca como una arquitectura aprobada del proyecto.
 */
export function loadDraft(): ArchitectureConfig | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ArchitectureConfig> | null;
    if (!parsed || typeof parsed.family !== 'string' || !FAMILIES.some((item) => item.id === parsed.family)) return null;
    if (!Array.isArray(parsed.layers)) return null;
    const family = parsed.family as NetworkFamily;
    const template = createTemplate(family);
    const layers = (parsed.layers as LayerConfig[]).filter(
      (layer) => layer && typeof layer.id === 'string' && layer.type in layerCatalog,
    );
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : template.name,
      family,
      input: { ...template.input, ...(parsed.input ?? {}) },
      layers,
      connections: Array.isArray(parsed.connections) ? (parsed.connections as NeuronConnection[]) : [],
    };
  } catch {
    return null;
  }
}
