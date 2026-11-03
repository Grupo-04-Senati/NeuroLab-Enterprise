import type { DirectoryUser, ProjectRecord } from '@/types/project';

/** Directorio demo de personas. El proveedor de identidad real llega con M10. */
export const directoryUsers: DirectoryUser[] = [
  {
    id: 'USR-207',
    displayName: 'Ana Quispe Ramos',
    email: 'ana.quispe@neurolab.enterprise',
    initials: 'AQ',
    title: 'Ingeniera de IA',
    role: 'engineer',
  },
  {
    id: 'USR-212',
    displayName: 'Luis Paredes Soto',
    email: 'luis.paredes@neurolab.enterprise',
    initials: 'LP',
    title: 'Ingeniero de IA',
    role: 'engineer',
  },
  {
    id: 'USR-218',
    displayName: 'Rosa Medina Vega',
    email: 'rosa.medina@neurolab.enterprise',
    initials: 'RM',
    title: 'Revisora de modelos',
    role: 'reviewer',
  },
  {
    id: 'USR-223',
    displayName: 'Diego Salas Rojas',
    email: 'diego.salas@neurolab.enterprise',
    initials: 'DS',
    title: 'Responsable de proyecto',
    role: 'owner',
  },
  {
    id: 'USR-231',
    displayName: 'Carla Núñez Prado',
    email: 'carla.nunez@neurolab.enterprise',
    initials: 'CN',
    title: 'Analista de datos',
    role: 'reader',
  },
  {
    id: 'USR-236',
    displayName: 'Marco Herrera León',
    email: 'marco.herrera@neurolab.enterprise',
    initials: 'MH',
    title: 'Ingeniero de ML',
    role: 'engineer',
  },
  {
    id: 'USR-244',
    displayName: 'Elena Torres Gil',
    email: 'elena.torres@neurolab.enterprise',
    initials: 'ET',
    title: 'Revisora de modelos',
    role: 'reviewer',
  },
  {
    id: 'USR-251',
    displayName: 'Jorge Campos Ríos',
    email: 'jorge.campos@neurolab.enterprise',
    initials: 'JC',
    title: 'Auditor de datos',
    role: 'reader',
  },
];

/** Cartera demo del M02: proyectos accesibles para el usuario de la sesión. */
export const seedProjects: ProjectRecord[] = [
  {
    id: 'PRJ-118',
    name: 'Scoring de riesgo de fuga',
    description:
      'Predecir la probabilidad de que un cliente empresarial cancele su contrato en los próximos 90 días, priorizando las cuentas que requieren intervención del equipo de éxito del cliente.',
    family: 'FEEDFORWARD',
    status: 'ACTIVE',
    ownerId: 'USR-207',
    members: [
      { userId: 'USR-207', role: 'owner', addedAt: '2026-07-14T09:00:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-07-18T14:30:00.000Z' },
      { userId: 'USR-218', role: 'reviewer', addedAt: '2026-08-02T10:15:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-09-10T16:40:00.000Z' },
    ],
    tags: ['riesgo', 'binario', 'customer-success'],
    documents: [
      {
        id: 'DOC-118-01',
        title: 'Contexto del problema',
        body:
          'El equipo comercial detecta la intención de cancelación demasiado tarde: las señales de uso se revisan de forma manual y solo cuando el cliente ya abrió un ticket de salida.\n\nEste proyecto busca anticipar esa decisión con un modelo binario que combine actividad del producto, tickets de soporte y facturación de los últimos seis meses. El resultado se usará como insumo para priorizar llamadas de retención, nunca para decisiones automáticas.',
        authorId: 'USR-207',
        updatedAt: '2026-10-27T15:10:00.000Z',
      },
      {
        id: 'DOC-118-02',
        title: 'Criterios de éxito',
        body:
          'La versión candidata debe alcanzar un AUC-ROC igual o superior a 0,86 en la partición de prueba y mantener una tasa de falsos positivos por debajo del 18 %.\n\nLa revisión de sesgo se hará por segmento de antigüedad y tamaño de cuenta. Un modelo que incumpla cualquiera de los dos criterios se devuelve a diseño antes de publicarse.',
        authorId: 'USR-218',
        updatedAt: '2026-10-22T11:35:00.000Z',
      },
    ],
    createdAt: '2026-07-14T09:00:00.000Z',
    updatedAt: '2026-10-28T16:20:00.000Z',
  },
  {
    id: 'PRJ-121',
    name: 'Detección de fraude transaccional',
    description:
      'Identificar cargos fraudulentos en secuencias cortas de transacciones con ventana deslizante, reduciendo falsos positivos frente al motor de reglas actual.',
    family: 'RNN',
    status: 'ACTIVE',
    ownerId: 'USR-223',
    members: [
      { userId: 'USR-223', role: 'owner', addedAt: '2026-06-02T08:20:00.000Z' },
      { userId: 'USR-207', role: 'engineer', addedAt: '2026-06-08T13:00:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-06-15T09:45:00.000Z' },
      { userId: 'USR-244', role: 'reviewer', addedAt: '2026-07-01T17:10:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-08-19T10:05:00.000Z' },
    ],
    tags: ['fraude', 'series-temporales', 'tiempo-real'],
    documents: [
      {
        id: 'DOC-121-01',
        title: 'Arquitectura objetivo',
        body:
          'Se evaluará una red recurrente con unidades GRU sobre ventanas de 20 transacciones. La entrada combina monto normalizado, canal, comercio y hora; la salida es una probabilidad calibrada de fraude.\n\nEl modelo no reemplaza al motor de reglas: se ejecuta como segunda capa de scoring y solo recibe los eventos que superan el umbral inicial.',
        authorId: 'USR-223',
        updatedAt: '2026-10-26T18:00:00.000Z',
      },
    ],
    createdAt: '2026-06-02T08:20:00.000Z',
    updatedAt: '2026-10-29T08:10:00.000Z',
  },
  {
    id: 'PRJ-126',
    name: 'Visión industrial de juntas',
    description:
      'Detectar defectos superficiales en juntas metálicas durante la línea de ensamblaje y clasificar su severidad para activar el rechazo automático.',
    family: 'CNN',
    status: 'ACTIVE',
    ownerId: 'USR-207',
    members: [
      { userId: 'USR-207', role: 'owner', addedAt: '2026-08-05T07:30:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-08-05T07:30:00.000Z' },
      { userId: 'USR-218', role: 'reviewer', addedAt: '2026-08-21T12:00:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-09-02T15:25:00.000Z' },
    ],
    tags: ['visión', 'manufactura', 'calidad'],
    documents: [
      {
        id: 'DOC-126-01',
        title: 'Plan de etiquetado',
        body:
          'Cada imagen se etiqueta con una de cuatro clases: junta conforme, porosidad leve, fisura y deformación. Dos especialistas revisan las muestras dudosas y un tercero resuelve los desacuerdos.\n\nLas imágenes de la cámara de inspección conservan su resolución original. El recorte se aplica solo en el preprocesamiento del modelo y queda registrado en la configuración.',
        authorId: 'USR-207',
        updatedAt: '2026-10-24T09:20:00.000Z',
      },
      {
        id: 'DOC-126-02',
        title: 'Restricciones de la línea',
        body:
          'La inferencia debe completarse en menos de 120 ms por pieza para no detener la línea. El modelo corre en el servidor de planta y no puede enviar imágenes fuera de la red industrial.\n\nCualquier cambio de iluminación o de posición de cámara invalida la calibración y exige una nueva versión del dataset.',
        authorId: 'USR-212',
        updatedAt: '2026-10-27T11:45:00.000Z',
      },
    ],
    createdAt: '2026-08-05T07:30:00.000Z',
    updatedAt: '2026-10-27T11:45:00.000Z',
  },
  {
    id: 'PRJ-131',
    name: 'Síntesis de datos tabulares',
    description:
      'Generar muestras sintéticas que equilibren las clases minoritarias de los sensores de turbina sin exponer datos operativos confidenciales.',
    family: 'GAN',
    status: 'DRAFT',
    ownerId: 'USR-212',
    members: [
      { userId: 'USR-212', role: 'owner', addedAt: '2026-09-18T10:00:00.000Z' },
      { userId: 'USR-207', role: 'reviewer', addedAt: '2026-09-22T11:30:00.000Z' },
      { userId: 'USR-223', role: 'engineer', addedAt: '2026-09-29T09:15:00.000Z' },
    ],
    tags: ['generativo', 'datos-sinteticos', 'tabular'],
    documents: [
      {
        id: 'DOC-131-01',
        title: 'Alcance del piloto',
        body:
          'El piloto se limita a las lecturas de vibración de dos turbinas y a tres clases de fallo poco frecuentes. La meta es duplicar la representación de esas clases sin alterar la distribución de las variables de operación.\n\nAntes de entrenar cualquier modelo de producción, el equipo de calidad de datos debe validar que las muestras sintéticas no contengan identificadores reconstruibles.',
        authorId: 'USR-212',
        updatedAt: '2026-10-25T09:30:00.000Z',
      },
    ],
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-10-25T09:30:00.000Z',
  },
  {
    id: 'PRJ-018',
    name: 'Clasificación de dígitos',
    description:
      'Reconocer dígitos manuscritos en formularios escaneados para automatizar la captura de códigos de cliente y reducir la digitación manual.',
    family: 'FEEDFORWARD',
    status: 'ACTIVE',
    ownerId: 'USR-207',
    members: [
      { userId: 'USR-207', role: 'owner', addedAt: '2026-03-11T08:40:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-03-19T10:10:00.000Z' },
      { userId: 'USR-218', role: 'reviewer', addedAt: '2026-04-04T14:50:00.000Z' },
    ],
    tags: ['visión', 'digitos', 'benchmark'],
    documents: [
      {
        id: 'DOC-018-01',
        title: 'Problema y alcance',
        body:
          'Los formularios de afiliación llegan escaneados y el código de cliente se transcribe a mano. El error de digitación genera duplicados y retrasa la activación del servicio.\n\nEl alcance inicial cubre formularios del último año con calidad de escaneo aceptable. Los formularios rotados, cortados o con anotaciones manuales se derivan a revisión humana.',
        authorId: 'USR-207',
        updatedAt: '2026-09-30T11:05:00.000Z',
      },
      {
        id: 'DOC-018-02',
        title: 'Línea base del modelo',
        body:
          'La red Feedforward de referencia usa una capa oculta de 128 unidades con activación ReLU y salida softmax de 10 clases. Se entrena con 70 000 imágenes normalizadas a 28×28.\n\nLa exactitud objetivo es 98,5 % en prueba. Cualquier versión por debajo de ese umbral se compara contra el motor de OCR actual antes de proponer un despliegue.',
        authorId: 'USR-212',
        updatedAt: '2026-10-28T10:05:00.000Z',
      },
    ],
    createdAt: '2026-03-11T08:40:00.000Z',
    updatedAt: '2026-10-28T10:05:00.000Z',
  },
  {
    id: 'PRJ-021',
    name: 'Visión para objetos',
    description:
      'Clasificar objetos y prendas en imágenes de inventario para mejorar la búsqueda visual del catálogo y detectar publicaciones incompletas.',
    family: 'CNN',
    status: 'ACTIVE',
    ownerId: 'USR-212',
    members: [
      { userId: 'USR-212', role: 'owner', addedAt: '2026-05-06T09:00:00.000Z' },
      { userId: 'USR-207', role: 'engineer', addedAt: '2026-05-13T15:20:00.000Z' },
      { userId: 'USR-223', role: 'engineer', addedAt: '2026-06-01T11:00:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-07-22T10:35:00.000Z' },
    ],
    tags: ['visión', 'objetos', 'cnn'],
    documents: [
      {
        id: 'DOC-021-01',
        title: 'Fuentes de imágenes',
        body:
          'El corpus combina fotos de estudio del catálogo con imágenes de usuarios aprobadas para uso interno. Las fotos con fondo transparente se convierten a fondo neutro para reducir atajos visuales.\n\nCada lote conserva un manifiesto con origen, licencia y fecha de ingesta. Un lote sin manifiesto completo no puede usarse en entrenamiento.',
        authorId: 'USR-212',
        updatedAt: '2026-10-26T17:40:00.000Z',
      },
    ],
    createdAt: '2026-05-06T09:00:00.000Z',
    updatedAt: '2026-10-26T17:40:00.000Z',
  },
  {
    id: 'PRJ-024',
    name: 'Análisis de sentimiento',
    description:
      'Clasificar la polaridad de reseñas de productos en español para priorizar reclamos y detectar caídas de satisfacción por categoría.',
    family: 'RNN',
    status: 'ACTIVE',
    ownerId: 'USR-207',
    members: [
      { userId: 'USR-207', role: 'owner', addedAt: '2026-04-09T10:00:00.000Z' },
      { userId: 'USR-218', role: 'reviewer', addedAt: '2026-04-16T09:40:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-05-03T16:15:00.000Z' },
    ],
    tags: ['nlp', 'sentimiento', 'español'],
    documents: [
      {
        id: 'DOC-024-01',
        title: 'Diccionario de etiquetas',
        body:
          'La polaridad se anota en tres clases: negativa, neutra y positiva. Una reseña con elogios y quejas se marca según la intención dominante y se conserva una nota con los aspectos mixtos.\n\nLos sarcasmos evidentes se excluyen del conjunto de evaluación para evitar inflar la métrica. El equipo de lingüística mantiene ejemplos guía por categoría.',
        authorId: 'USR-207',
        updatedAt: '2026-09-28T12:30:00.000Z',
      },
      {
        id: 'DOC-024-02',
        title: 'Protocolo de anonimización',
        body:
          'Antes de cargar una reseña se eliminan correos, teléfonos, nombres propios y números de pedido. El texto anonimizado se revisa por muestreo antes de publicar una nueva versión del dataset.\n\nNingún modelo se entrena con textos crudos. La referencia al dataset anonimizado queda registrada en cada trabajo de entrenamiento.',
        authorId: 'USR-218',
        updatedAt: '2026-10-24T14:15:00.000Z',
      },
    ],
    createdAt: '2026-04-09T10:00:00.000Z',
    updatedAt: '2026-10-24T14:15:00.000Z',
  },
  {
    id: 'PRJ-027',
    name: 'Detección de anomalías sísmicas',
    description:
      'Detectar patrones anómalos en ventanas de sensores sísmicos del norte del país para emitir alertas tempranas con revisión humana.',
    family: 'RNN',
    status: 'ACTIVE',
    ownerId: 'USR-223',
    members: [
      { userId: 'USR-223', role: 'owner', addedAt: '2026-02-17T08:00:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-02-25T10:20:00.000Z' },
      { userId: 'USR-207', role: 'reader', addedAt: '2026-08-14T09:10:00.000Z' },
      { userId: 'USR-218', role: 'reviewer', addedAt: '2026-09-01T13:45:00.000Z' },
    ],
    tags: ['series-temporales', 'sensores', 'anomalias'],
    documents: [
      {
        id: 'DOC-027-01',
        title: 'Contexto operativo',
        body:
          'Las estaciones del norte envían ventanas de 10 segundos con tres componentes de movimiento. El equipo de geofísica marca como anómalas las señales que superan el ruido de fondo y que no corresponden a eventos catalogados.\n\nLa salida del modelo es una alerta priorizada para el turno de monitoreo. Ninguna alerta activa protocolos automáticos: la decisión final siempre es humana.',
        authorId: 'USR-223',
        updatedAt: '2026-10-29T07:20:00.000Z',
      },
    ],
    createdAt: '2026-02-17T08:00:00.000Z',
    updatedAt: '2026-10-29T07:20:00.000Z',
  },
  {
    id: 'PRJ-029',
    name: 'Generación de retratos',
    description:
      'Entrenar un generador de retratos sintéticos para aumentar la diversidad de un dataset de referencia sin recurrir a imágenes de personas reales.',
    family: 'GAN',
    status: 'DRAFT',
    ownerId: 'USR-223',
    members: [
      { userId: 'USR-223', role: 'owner', addedAt: '2026-09-22T12:00:00.000Z' },
      { userId: 'USR-212', role: 'engineer', addedAt: '2026-09-27T09:30:00.000Z' },
      { userId: 'USR-207', role: 'reviewer', addedAt: '2026-10-01T15:00:00.000Z' },
    ],
    tags: ['generativo', 'imagenes'],
    documents: [],
    createdAt: '2026-09-22T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  },
  {
    id: 'PRJ-031',
    name: 'Regresión de precios',
    description:
      'Estimar el precio de vivienda a partir de distrito, área y características estructurales para apoyar la tasación inicial de créditos hipotecarios.',
    family: 'FEEDFORWARD',
    status: 'ARCHIVED',
    ownerId: 'USR-207',
    members: [
      { userId: 'USR-207', role: 'owner', addedAt: '2026-01-20T09:30:00.000Z' },
      { userId: 'USR-231', role: 'reader', addedAt: '2026-02-11T11:45:00.000Z' },
    ],
    tags: ['tabular', 'regresion'],
    documents: [
      {
        id: 'DOC-031-01',
        title: 'Cierre del piloto',
        body:
          'El piloto se archivó porque la variable de distrito no estaba actualizada en el sistema de origen. El error medio absoluto no fue comparable con la tasación manual y el equipo decidió esperar una nueva fuente catastral.\n\nSe conservan las versiones del dataset y del modelo para trazabilidad. La reapertura requiere una revisión del alcance y una nueva aprobación del comité de riesgos.',
        authorId: 'USR-207',
        updatedAt: '2026-09-30T15:00:00.000Z',
      },
    ],
    createdAt: '2026-01-20T09:30:00.000Z',
    updatedAt: '2026-09-30T15:00:00.000Z',
  },
];
