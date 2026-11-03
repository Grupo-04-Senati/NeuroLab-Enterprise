/**
 * Contenido curricular del M03 (Fundamentos neuronales).
 * Corresponde a la operación «Definir la red neuronal y su importancia» y a sus
 * descriptores de la Semana 11: neuronas, capas, conexiones y activaciones.
 */

export interface ConceptCard {
  id: string;
  title: string;
  lead: string;
  points: string[];
}

export const CONCEPTS: ConceptCard[] = [
  {
    id: 'definicion',
    title: 'Qué es una red neuronal artificial',
    lead:
      'Una sucesión de unidades simples —neuronas— organizadas en capas, donde cada conexión aporta un peso y cada neurona aplica una función de activación a la suma ponderada de sus entradas.',
    points: [
      'Cada neurona calcula z = Σ wᵢxᵢ + b y devuelve f(z).',
      'Las capas se apilan: la salida de una es la entrada de la siguiente (feedforward).',
      'El conocimiento reside en los pesos, no en el código de la red.',
    ],
  },
  {
    id: 'importancia',
    title: 'Su importancia en la inteligencia artificial',
    lead:
      'Aprenden la transformación entre datos y decisión a partir de ejemplos, sin que una persona escriba reglas explícitas para cada caso.',
    points: [
      'Aproximan funciones complejas a partir de datos etiquetados.',
      'Extraen representaciones intermedias útiles (características aprendidas).',
      'Sostienen tareas modernas: visión, lenguaje, series de tiempo y síntesis.',
    ],
  },
  {
    id: 'aprendizaje',
    title: 'Cómo aprende la red',
    lead:
      'El entrenamiento repite tres pasos hasta que la pérdida deja de mejorar: propagar, medir el error y corregir los pesos con descenso del gradiente.',
    points: [
      'Propagación hacia adelante: se calcula la predicción actual.',
      'Pérdida: se cuantifica la distancia frente al valor esperado.',
      'Retropropagación: el gradiente indica en qué ajustar cada peso.',
    ],
  },
];

export type LayerRoleId = 'entrada' | 'oculta' | 'salida';

export interface LayerRole {
  id: LayerRoleId;
  name: string;
  index: string;
  detail: string;
  duties: string[];
  example: string;
}

export const LAYER_ROLES: LayerRole[] = [
  {
    id: 'entrada',
    name: 'Capa de entrada',
    index: 'Capa 0',
    detail:
      'Recibe las características del dataset sin transformarlas. Su anchura fija la dimensionalidad del problema: toda la red se dimensiona a partir de ella.',
    duties: [
      'Define el número de variables que consume el modelo.',
      'No aplica activación: entrega el valor normalizado tal cual.',
      'Concentra las conexiones hacia la primera capa oculta.',
    ],
    example: 'En clientes_cartera_2026.csv, las 18 columnas codificadas del cliente.',
  },
  {
    id: 'oculta',
    name: 'Capa oculta',
    index: 'Capas intermedias',
    detail:
      'Interpreta combinaciones de entradas y produce representaciones progresivamente abstractas. Apilar capas y unidades es la forma de aumentar la capacidad de la red.',
    duties: [
      'Aplica pesos, sesgo y una activación no lineal.',
      'Varias capas encadenadas amplían la profundidad del modelo.',
      'Sin no linealidad, dos capas equivaldrían a una sola.',
    ],
    example: 'dense(64, relu) seguida de dense(32, relu) en un clasificador binario.',
  },
  {
    id: 'salida',
    name: 'Capa de salida',
    index: 'Última capa',
    detail:
      'Traduce la representación interna al formato de la respuesta esperada. Su forma y activación dependen de la tarea, no de un criterio estético.',
    duties: [
      'Una unidad con sigmoid para clasificación binaria.',
      'n unidades con softmax para n clases excluyentes.',
      'Activación lineal cuando se predice un valor continuo.',
    ],
    example: 'dense(1, sigmoid) para estimar la probabilidad de fuga.',
  },
];

/** Forma de la red de ejemplo que dibuja el diagrama de capas. */
export const NETWORK_SHAPE = [3, 4, 3, 1];

export function connectionCount(shape: number[]): number {
  return shape.slice(0, -1).reduce((total, units, index) => total + units * shape[index + 1], 0);
}

export function neuronCount(shape: number[]): number {
  return shape.reduce((total, units) => total + units, 0);
}

export type ActivationRisk = 'vanishing' | 'dead';

export interface ActivationFunction {
  id: string;
  name: string;
  formula: string;
  evaluate: (x: number) => number;
  range: string;
  /** Nota sobre el dominio representado en la gráfica. */
  plotNote: string;
  slopeAtZero: number;
  bounded: boolean;
  risks: ActivationRisk[];
  uses: string;
  notes: string[];
}

export const ACTIVATIONS: ActivationFunction[] = [
  {
    id: 'sigmoid',
    name: 'Sigmoid',
    formula: 'f(z) = 1 / (1 + e⁻ᶻ)',
    evaluate: (z) => 1 / (1 + Math.exp(-z)),
    range: '(0, 1)',
    plotNote: 'Salida escalar.',
    slopeAtZero: 0.25,
    bounded: true,
    risks: ['vanishing'],
    uses: 'Capa de salida binaria: se lee como probabilidad.',
    notes: [
      'Satura rápido: con |z| grande la derivada tiende a cero.',
      'Centro en 0,5, lo que desplaza las activaciones positivas.',
    ],
  },
  {
    id: 'tanh',
    name: 'Tangente hiperbólica',
    formula: 'f(z) = (eᶻ − e⁻ᶻ) / (eᶻ + e⁻ᶻ)',
    evaluate: (z) => Math.tanh(z),
    range: '(−1, 1)',
    plotNote: 'Salida escalar.',
    slopeAtZero: 1,
    bounded: true,
    risks: ['vanishing'],
    uses: 'Capas ocultas de secuencias (RNN clásicas).',
    notes: ['Centrada en cero, por eso converge mejor que sigmoid.', 'Mantiene la saturación en los extremos.'],
  },
  {
    id: 'relu',
    name: 'ReLU',
    formula: 'f(z) = máx(0, z)',
    evaluate: (z) => Math.max(0, z),
    range: '[0, ∞)',
    plotNote: 'Corte duro en cero.',
    slopeAtZero: 1,
    bounded: false,
    risks: ['dead'],
    uses: 'Activación por defecto en capas ocultas densas y convolucionales.',
    notes: [
      'Barata y estable frente al gradiente que se desvanece.',
      'Una neurona con z negativo constante deja de aportar: neurona muerta.',
    ],
  },
  {
    id: 'leaky-relu',
    name: 'Leaky ReLU',
    formula: 'f(z) = z si z > 0; 0,01·z en caso contrario',
    evaluate: (z) => (z > 0 ? z : 0.01 * z),
    range: '(−∞, ∞)',
    plotNote: 'Pendiente negativa pequeña.',
    slopeAtZero: 1,
    bounded: false,
    risks: [],
    uses: 'Alternativa a ReLU cuando se pierden neuronas por saturación.',
    notes: ['Mantiene gradiente en la zona negativa.', 'La pendiente 0,01 es un hiperparámetro habitual.'],
  },
  {
    id: 'softmax',
    name: 'Softmax',
    formula: 'f(zᵢ) = eᶻⁱ / Σⱼ eᶻʲ',
    evaluate: (z) => 1 / (1 + Math.exp(-z)),
    range: '(0, 1) y Σ = 1',
    plotNote: 'Se grafica el par (z, 0): equivale a sigmoid en dos clases.',
    slopeAtZero: 0.25,
    bounded: true,
    risks: ['vanishing'],
    uses: 'Salida multiclase con pérdida de entropía cruzada.',
    notes: ['Actúa sobre el vector completo, no sobre cada unidad aislada.', 'Competitiva: sube una clase solo si bajan las demás.'],
  },
  {
    id: 'lineal',
    name: 'Lineal',
    formula: 'f(z) = z',
    evaluate: (z) => z,
    range: '(−∞, ∞)',
    plotNote: 'Identidad sin saturación.',
    slopeAtZero: 1,
    bounded: false,
    risks: [],
    uses: 'Salida en regresión y capas de arranque de GAN.',
    notes: ['Aporta capacidad, pero no no linealidad.'],
  },
];

export const RISK_LABELS: Record<ActivationRisk, string> = {
  vanishing: 'Gradiente que se desvanece',
  dead: 'Neurona muerta',
};

export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
  related: string[];
}

export const GLOSSARY_CATEGORIES = ['Estructura', 'Parámetros', 'Activación', 'Entrenamiento'] as const;

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Neurona artificial',
    category: 'Estructura',
    definition:
      'Unidad que suma sus entradas multiplicadas por pesos, añade un sesgo y aplica una función de activación al resultado.',
    related: ['Peso', 'Sesgo', 'Función de activación'],
  },
  {
    term: 'Capa',
    category: 'Estructura',
    definition:
      'Grupo de neuronas que comparten entrada y activación. La sucesión de capas define la arquitectura de la red.',
    related: ['Capa de entrada', 'Capa oculta', 'Profundidad'],
  },
  {
    term: 'Conexión',
    category: 'Estructura',
    definition:
      'Enlace entre dos neuronas de capas consecutivas. En una capa densa cada neurona se conecta con todas las de la anterior.',
    related: ['Capa densa', 'Peso'],
  },
  {
    term: 'Capa densa (Dense)',
    category: 'Estructura',
    definition:
      'Capa totalmente conectada: cada neurona recibe una entrada desde cada neurona de la capa previa.',
    related: ['Conexión', 'Tensor de pesos'],
  },
  {
    term: 'Feedforward',
    category: 'Estructura',
    definition:
      'Red en la que la información avanza en una sola dirección, de la entrada a la salida, sin ciclos.',
    related: ['RNN', 'Capa'],
  },
  {
    term: 'Peso',
    category: 'Parámetros',
    definition:
      'Coeficiente aprendible de una conexión. Su magnitud indica cuánto influye la entrada de origen en la neurona destino.',
    related: ['Sesgo', 'Inicialización'],
  },
  {
    term: 'Sesgo',
    category: 'Parámetros',
    definition:
      'Término independiente por neurona que desplaza el umbral de activación y permite ajustar la recta o curva de decisión.',
    related: ['Peso', 'Función de activación'],
  },
  {
    term: 'Tensor de pesos',
    category: 'Parámetros',
    definition:
      'Matriz que agrupa los pesos de una capa: sus dimensiones coinciden con las neuronas de origen y destino.',
    related: ['Capa densa', 'Parámetro'],
  },
  {
    term: 'Función de activación',
    category: 'Activación',
    definition:
      'Transformación no lineal aplicada a z = Σ wᵢx + b. Sin ella, varias capas colapsarían en una transformación lineal.',
    related: ['ReLU', 'Sigmoid', 'No linealidad'],
  },
  {
    term: 'No linealidad',
    category: 'Activación',
    definition:
      'Propiedad que permite a la red aproximar fronteras de decisión curvas en lugar de combinaciones lineales.',
    related: ['Función de activación', 'Aproximador universal'],
  },
  {
    term: 'Saturación',
    category: 'Activación',
    definition:
      'Zona de la curva donde la derivada tiende a cero; el gradiente deja de fluir y el aprendizaje se detiene en esa neurona.',
    related: ['Gradiente', 'Sigmoid'],
  },
  {
    term: 'Época',
    category: 'Entrenamiento',
    definition: 'Una pasada completa del dataset por la red durante el entrenamiento.',
    related: ['Batch', 'Pérdida'],
  },
  {
    term: 'Batch',
    category: 'Entrenamiento',
    definition:
      'Subconjunto de muestras procesadas juntas. Define el ruido del gradiente y el consumo de memoria del worker.',
    related: ['Época', 'Optimizador'],
  },
  {
    term: 'Pérdida',
    category: 'Entrenamiento',
    definition:
      'Métrica que cuantifica el error de la predicción frente al valor esperado; es la función que el optimizador intenta minimizar.',
    related: ['Retropropagación', 'Entropía cruzada'],
  },
  {
    term: 'Retropropagación',
    category: 'Entrenamiento',
    definition:
      'Aplicación de la regla de la cadena para repartir el error desde la salida hasta cada peso de la red.',
    related: ['Gradiente', 'Tasa de aprendizaje'],
  },
  {
    term: 'Tasa de aprendizaje',
    category: 'Entrenamiento',
    definition:
      'Paso con el que el optimizador actualiza los pesos. Demasiado grande impide converger; demasiado pequeño alarga el entrenamiento.',
    related: ['Optimizador', 'Gradiente'],
  },
];

export interface NeuronProduct {
  input: number;
  weight: number;
  value: number;
}

export interface NeuronComputation {
  products: NeuronProduct[];
  weightedSum: number;
  bias: number;
  z: number;
  output: number;
}

/**
 * Reproduce el cálculo real de una unidad Keras: dot(x, w) + b y después la activación.
 * Se usa en el ejemplo guiado para que cada paso sea verificable.
 */
export function computeNeuron(
  inputs: number[],
  weights: number[],
  bias: number,
  activation: ActivationFunction,
): NeuronComputation {
  const products = inputs.map((input, index) => ({
    input,
    weight: weights[index] ?? 0,
    value: input * (weights[index] ?? 0),
  }));
  const weightedSum = products.reduce((total, product) => total + product.value, 0);
  const z = weightedSum + bias;
  return { products, weightedSum, bias, z, output: activation.evaluate(z) };
}

export const DEFAULT_EXAMPLE = {
  inputs: [0.8, -1.2, 0.35],
  weights: [1.1, 0.6, -1.4],
  bias: 0.2,
  activationId: 'sigmoid',
};
