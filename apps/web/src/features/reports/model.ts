/* Modelo del M09 · Reportes.
   Reúne la información autorizada de M02, M04, M05 y M06 en un documento único, aplica la
   máscara que corresponde al rol del actor y produce la exportación CSV. La exportación PDF
   usa esa misma estructura: pantalla, impresión y archivo comparten una sola fuente de datos.
   Ningún cálculo de red neuronal ocurre aquí (RN-03): sólo lectura y agregación. */

import type { IconName } from '@/components/ui/Icon';
import type { Actor, EpochPoint, TrainingJob, UserRole } from '@/types/domain';
import type { ProjectMemberRole, ProjectRecord } from '@/types/project';
import type { DatasetRecord } from '@/types/dataset';
import type { DirectoryUser } from '@/types/project';
import type { ArchitectureConfig } from '@/features/architectures/model';
import type { RunRecord, RunStore } from '@/features/training/model';
import { computeArchitecture, formatParams, formatShape } from '@/features/architectures/model';
import { auditDataset, formatBytes, validateSplit } from '@/features/datasets/model';
import { PRIORITY_LABEL, isActive, recordFor, versionFor } from '@/features/training/model';
import { familyMeta, roleLabels, statusMeta } from '@/lib/nav';
import { formatDate, formatDateTime, formatDuration, formatNumber, formatRate, formatRelativeTime } from '@/lib/format';

/* ------------------------------------------------------------------ capacidades */

export type ReportCapability =
  | 'ver'
  | 'exportar-csv'
  | 'exportar-pdf'
  | 'ver-tecnico'
  | 'ver-reproduccion';

export type ReportFormat = 'CSV' | 'PDF';

export interface CapabilityRule {
  id: ReportCapability;
  label: string;
  hint: string;
  /** Roles de proyecto habilitados. La administración global siempre puede. */
  roles: ProjectMemberRole[];
  /** Roles globales que la consola muestra como referencia en la matriz. */
  globals: UserRole[];
}

/** §4.2 y §11: el lector consulta, pero no distribuye; la reproducción exige trabajo técnico. */
export const CAPABILITY_RULES: CapabilityRule[] = [
  {
    id: 'ver',
    label: 'Consultar el informe',
    hint: 'Cualquier integrante autorizado del proyecto, incluida la lectura simple.',
    roles: ['owner', 'engineer', 'reviewer', 'reader'],
    globals: ['admin', 'owner', 'engineer', 'reviewer', 'reader'],
  },
  {
    id: 'exportar-csv',
    label: 'Exportar CSV',
    hint: 'Descarga tabular para análisis. No la concede el acceso de solo lectura.',
    roles: ['owner', 'engineer', 'reviewer'],
    globals: ['admin', 'owner', 'engineer', 'reviewer'],
  },
  {
    id: 'exportar-pdf',
    label: 'Exportar PDF',
    hint: 'Documento cerrado con valor de aprobación: responsable del proyecto, revisor o administración.',
    roles: ['owner', 'reviewer'],
    globals: ['admin', 'owner', 'reviewer'],
  },
  {
    id: 'ver-tecnico',
    label: 'Ver detalle técnico',
    hint: 'Bitácora de worker, validaciones de dataset e incidencias de la arquitectura.',
    roles: ['owner', 'engineer'],
    globals: ['admin', 'owner', 'engineer'],
  },
  {
    id: 'ver-reproduccion',
    label: 'Ver parámetros de reproducción',
    hint: 'Semilla, tasa de aprendizaje y huella de los artefactos.',
    roles: ['owner', 'engineer', 'reviewer'],
    globals: ['admin', 'owner', 'engineer', 'reviewer'],
  },
];

const RULE_BY_ID = new Map(CAPABILITY_RULES.map((rule) => [rule.id, rule]));

export const MASKED = 'restringido por rol';

export interface ReportAccess {
  actorRole: UserRole;
  /** Rol del actor dentro del proyecto; `global-admin` cuando la sesión es administración. */
  projectRole: ProjectMemberRole | 'global-admin' | null;
  projectRoleLabel: string;
  allowed: ReportCapability[];
  denied: Array<{ id: ReportCapability; label: string; reason: string }>;
  canView: boolean;
}

export function resolveAccess(actor: Actor, project: ProjectRecord): ReportAccess {
  const membership = project.members.find((member) => member.userId === actor.id)?.role ?? null;
  const isGlobalAdmin = actor.role === 'admin';
  const effective: ProjectMemberRole | 'global-admin' | null = isGlobalAdmin
    ? 'global-admin'
    : membership;

  const allowed = CAPABILITY_RULES.filter((rule) =>
    isGlobalAdmin ? true : membership !== null && rule.roles.includes(membership),
  ).map((rule) => rule.id);

  const denied = CAPABILITY_RULES.filter((rule) => !allowed.includes(rule.id)).map((rule) => ({
    id: rule.id,
    label: rule.label,
    reason:
      membership === null && !isGlobalAdmin
        ? 'No pertenece a este proyecto: el acceso está cerrado para evitar lectura horizontal (§12).'
        : rule.hint,
  }));

  return {
    actorRole: actor.role,
    projectRole: effective,
    projectRoleLabel:
      effective === null
        ? 'Sin acceso'
        : effective === 'global-admin'
          ? 'Administración global'
          : PROJECT_ROLE_LABELS[effective],
    allowed,
    denied,
    canView: allowed.includes('ver'),
  };
}

const PROJECT_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: 'Responsable de proyecto',
  engineer: 'Ingeniero de IA',
  reviewer: 'Revisor',
  reader: 'Lector',
};

export function canReport(access: ReportAccess, capability: ReportCapability): boolean {
  return access.allowed.includes(capability);
}

/** Regla única para la matriz de permisos de la pantalla. */
export function capabilityHint(capability: ReportCapability): string {
  return RULE_BY_ID.get(capability)?.hint ?? '';
}

/* ---------------------------------------------------------------------- secciones */

export type ReportSectionId = 'ficha' | 'arquitectura' | 'historial' | 'advertencias' | 'auditoria';

export interface ReportSectionMeta {
  id: ReportSectionId;
  label: string;
  module: string;
  description: string;
  icon: IconName;
  defaultOn: boolean;
  /** Capacidad mínima para incluir la sección; el resto se omite del documento. */
  requires: ReportCapability;
}

export const REPORT_SECTIONS: ReportSectionMeta[] = [
  {
    id: 'ficha',
    label: 'Ficha de proyecto',
    module: 'M02',
    description: 'Identidad, estado, equipo, etiquetas y datasets vinculados.',
    icon: 'fileText',
    defaultOn: true,
    requires: 'ver',
  },
  {
    id: 'arquitectura',
    label: 'Resumen de arquitectura',
    module: 'M04',
    description: 'Familia, capas y parámetros de las arquitecturas entrenadas, más el borrador activo.',
    icon: 'layers',
    defaultOn: true,
    requires: 'ver',
  },
  {
    id: 'historial',
    label: 'Historial de entrenamiento',
    module: 'M06',
    description: 'Ejecuciones del periodo con versión, duración, estado, parámetros principales y métricas.',
    icon: 'training',
    defaultOn: true,
    requires: 'ver',
  },
  {
    id: 'advertencias',
    label: 'Advertencias y límites',
    module: 'M05 · M10',
    description: 'Comprobaciones de dataset, estado del proyecto y límites de recursos registrados.',
    icon: 'alertTriangle',
    defaultOn: true,
    requires: 'ver',
  },
  {
    id: 'auditoria',
    label: 'Bitácora de exportaciones',
    module: 'M10',
    description: 'Trazabilidad de las descargas del proyecto: quién, cuándo, formato y huella del archivo.',
    icon: 'shield',
    defaultOn: false,
    requires: 'ver',
  },
];

export const SECTION_BY_ID = new Map(REPORT_SECTIONS.map((section) => [section.id, section]));

/* --------------------------------------------------------------------- bloques */

export interface ReportField {
  label: string;
  value: string;
  mono?: boolean;
}

export type ReportBlock =
  | { kind: 'fields'; title: string; fields: ReportField[] }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] }
  | { kind: 'list'; title: string; items: string[] }
  | { kind: 'note'; title: string; text: string; tone: 'info' | 'warning' | 'danger' }
  | { kind: 'chart'; title: string; model: string; points: EpochPoint[] };

export interface ReportSection {
  id: ReportSectionId;
  label: string;
  module: string;
  blocks: ReportBlock[];
  /** Filas de datos exportadas: útil en el diálogo de confirmación y en auditoría. */
  rows: number;
}

function blockRows(block: ReportBlock): number {
  if (block.kind === 'table') return block.rows.length;
  if (block.kind === 'fields') return block.fields.length;
  if (block.kind === 'list') return block.items.length;
  if (block.kind === 'chart') return block.points.length;
  return 0;
}

/* ---------------------------------------------------------------------- alcance */

export type RangePreset = 'ALL' | 'D30' | 'D90' | 'CUSTOM';

export const RANGE_PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'ALL', label: 'Todo el historial' },
  { id: 'D30', label: 'Últimos 30 días' },
  { id: 'D90', label: 'Últimos 90 días' },
  { id: 'CUSTOM', label: 'Rango personalizado' },
];

export interface ReportScope {
  preset: RangePreset;
  from: string;
  to: string;
}

export const DEFAULT_SCOPE: ReportScope = { preset: 'D90', from: '', to: '' };

export interface RangeBounds {
  from: number | null;
  to: number | null;
  label: string;
}

export function rangeBounds(scope: ReportScope, now: number): RangeBounds {
  if (scope.preset === 'D30' || scope.preset === 'D90') {
    const days = scope.preset === 'D30' ? 30 : 90;
    const from = now - days * 86_400_000;
    return {
      from,
      to: null,
      label: `Desde ${formatDate(new Date(from).toISOString())} hasta hoy`,
    };
  }
  if (scope.preset === 'CUSTOM' && (scope.from || scope.to)) {
    const from = scope.from ? Date.parse(`${scope.from}T00:00:00`) : null;
    const to = scope.to ? Date.parse(`${scope.to}T23:59:59`) : null;
    return {
      from: from !== null && Number.isFinite(from) ? from : null,
      to: to !== null && Number.isFinite(to) ? to : null,
      label: `${scope.from ? formatDate(`${scope.from}T00:00:00`) : 'inicio'} · ${
        scope.to ? formatDate(`${scope.to}T00:00:00`) : 'hoy'
      }`,
    };
  }
  return { from: null, to: null, label: 'Historial completo' };
}

function withinRange(iso: string | null, bounds: RangeBounds): boolean {
  if (!iso) return bounds.from === null;
  const stamp = Date.parse(iso);
  if (bounds.from !== null && stamp < bounds.from) return false;
  if (bounds.to !== null && stamp > bounds.to) return false;
  return true;
}

/* -------------------------------------------------------------------- documento */

/** Ejecuciones del proyecto dentro del alcance, más recientes primero. */
export function filterJobs(jobs: TrainingJob[], projectId: string, bounds: RangeBounds): TrainingJob[] {
  return jobs
    .filter((job) => job.projectId === projectId && withinRange(job.endedAt ?? job.queuedAt, bounds))
    .sort((a, b) => Date.parse(b.queuedAt) - Date.parse(a.queuedAt));
}

/** Mejor ejecución completada por val_acc: la misma regla usa la pantalla y la exportación. */
export function pickBestRun(jobs: TrainingJob[]): TrainingJob | null {
  return jobs.reduce<TrainingJob | null>(
    (best, job) => (job.status === 'COMPLETED' && (best === null || job.valAccuracy > best.valAccuracy) ? job : best),
    null,
  );
}

export interface ReportSources {
  project: ProjectRecord;
  users: DirectoryUser[];
  datasets: DatasetRecord[];
  jobs: TrainingJob[];
  records: RunStore;
  draft: ArchitectureConfig | null;
  events: ExportEvent[];
  bestRun: { jobId: string; points: EpochPoint[] } | null;
  dataSource: 'demo' | 'api';
  storage: { label: string; detail: string };
}

export interface ReportDocument {
  project: ProjectRecord;
  generatedAt: string;
  actor: { name: string; email: string; roleLabel: string; projectRoleLabel: string };
  scopeLabel: string;
  included: ReportSectionId[];
  sections: ReportSection[];
  masked: string[];
  dataSource: 'demo' | 'api';
  totals: ReportTotals;
}

export interface ReportTotals {
  runs: number;
  completed: number;
  failed: number;
  cancelled: number;
  active: number;
  bestAccuracy: number | null;
  gpuSeconds: number;
  datasets: number;
  members: number;
  architectures: number;
  layers: number | null;
  params: number | null;
  warnings: number;
  outsideScope: number;
}

export interface BuildResult {
  document: ReportDocument;
  problem?: string;
}

/**
 * Construye el documento según los permisos del actor. Lo que el rol no puede ver se sustituye
 * por `MASKED` y se declara en `masked`: la misma instancia alimenta la pantalla, el CSV y el PDF.
 */
export function buildReport(
  actor: Actor,
  sources: ReportSources,
  scope: ReportScope,
  selected: ReportSectionId[],
  now: number,
): BuildResult {
  const access = resolveAccess(actor, sources.project);
  if (!access.canView) {
    return {
      document: emptyDocument(actor, sources, access, now),
      problem:
        'No está autorizado a consultar la ficha de este proyecto. Solicite acceso al responsable o revise los proyectos donde participa.',
    };
  }

  const masked: string[] = [];
  const field = (label: string, value: string, needs?: ReportCapability, mono?: boolean): ReportField => {
    if (needs && !canReport(access, needs)) {
      if (!masked.includes(label)) masked.push(label);
      return { label, value: MASKED, mono };
    }
    return { label, value, mono };
  };

  const bounds = rangeBounds(scope, now);
  const projectJobs = sources.jobs.filter((job) => job.projectId === sources.project.id);
  const scopedJobs = filterJobs(sources.jobs, sources.project.id, bounds);
  const outsideScope = projectJobs.length - scopedJobs.length;

  const projectDatasets = sources.datasets.filter(
    (dataset) => dataset.projectId === sources.project.id,
  );

  const completed = scopedJobs.filter((job) => job.status === 'COMPLETED');
  const bestRun = pickBestRun(completed);

  const sections: ReportSection[] = [];
  if (selected.includes('ficha')) {
    sections.push(factSheet(sources, field, projectDatasets, scopedJobs.length, now));
  }
  if (selected.includes('arquitectura')) {
    sections.push(architectureSummary(sources, access, field, projectJobs, scopedJobs, bestRun));
  }
  if (selected.includes('historial')) {
    sections.push(
      trainingHistory(sources, access, field, scopedJobs, bounds.label, bestRun),
    );
  }
  if (selected.includes('advertencias')) {
    sections.push(warningSection(sources, access, projectDatasets, scopedJobs));
  }
  if (selected.includes('auditoria')) {
    sections.push(auditSection(sources, field));
  }

  const gpuSeconds = scopedJobs.reduce((sum, job) => sum + job.durationSeconds, 0);
  const draftComputation = sources.draft ? computeArchitecture(sources.draft) : null;
  const restricted = dedupe(masked.concat(maskedFromTables(sections)));

  return {
    document: {
      project: sources.project,
      generatedAt: new Date(now).toISOString(),
      actor: {
        name: actor.displayName,
        email: actor.email,
        roleLabel: roleLabels[actor.role] ?? actor.role,
        projectRoleLabel: access.projectRoleLabel,
      },
      scopeLabel: bounds.label,
      included: sections.map((section) => section.id),
      sections,
      masked: restricted,
      dataSource: sources.dataSource,
      totals: {
        runs: scopedJobs.length,
        completed: completed.length,
        failed: scopedJobs.filter((job) => job.status === 'FAILED').length,
        cancelled: scopedJobs.filter((job) => job.status === 'CANCELLED').length,
        active: scopedJobs.filter((job) => isActive(job.status)).length,
        bestAccuracy: bestRun ? bestRun.valAccuracy : null,
        gpuSeconds,
        datasets: projectDatasets.length,
        members: sources.project.members.length,
        architectures: new Set(scopedJobs.map((job) => job.architectureName)).size,
        layers: draftComputation ? draftComputation.results.length : null,
        params: draftComputation ? draftComputation.totalParams : null,
        warnings: countWarnings(sources, projectDatasets, scopedJobs),
        outsideScope,
      },
    },
  };
}

/**
 * §11: el registro de exportación nombra todo lo que el rol no pudo ver, incluso cuando el dato
 * viaja dentro de una tabla y no como campo etiquetado.
 */
function maskedFromTables(sections: ReportSection[]): string[] {
  const labels: string[] = [];
  sections.forEach((section) => {
    section.blocks.forEach((block) => {
      if (block.kind !== 'table') return;
      block.rows.forEach((row) => {
        row.forEach((cell, index) => {
          if (cell !== MASKED) return;
          const label = `${block.title} · ${block.columns[index] ?? section.label}`;
          if (!labels.includes(label)) labels.push(label);
        });
      });
    });
  });
  return labels;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function emptyDocument(
  actor: Actor,
  sources: ReportSources,
  access: ReportAccess,
  now: number,
): ReportDocument {
  return {
    project: sources.project,
    generatedAt: new Date(now).toISOString(),
    actor: {
      name: actor.displayName,
      email: actor.email,
      roleLabel: roleLabels[actor.role] ?? actor.role,
      projectRoleLabel: access.projectRoleLabel,
    },
    scopeLabel: 'sin alcance',
    included: [],
    sections: [],
    masked: [],
    dataSource: sources.dataSource,
    totals: {
      runs: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      active: 0,
      bestAccuracy: null,
      gpuSeconds: 0,
      datasets: 0,
      members: 0,
      architectures: 0,
      layers: null,
      params: null,
      warnings: 0,
      outsideScope: 0,
    },
  };
}

/* ------------------------------------------------------------------ secciones */

function factSheet(
  sources: ReportSources,
  field: (label: string, value: string, needs?: ReportCapability, mono?: boolean) => ReportField,
  datasets: DatasetRecord[],
  runs: number,
  now: number,
): ReportSection {
  const project = sources.project;
  const owner = sources.users.find((user) => user.id === project.ownerId);
  const members = project.members.flatMap((member) => {
    const user = sources.users.find((item) => item.id === member.userId);
    return user
      ? [
          [
            user.displayName,
            PROJECT_ROLE_LABELS[member.role],
            formatDate(member.addedAt),
          ] as string[],
        ]
      : [];
  });

  const identity: ReportField[] = [
    field('Identificador', project.id, undefined, true),
    field('Nombre', project.name),
    field('Familia de red', familyMeta[project.family].label),
    field('Estado', projectStatusLabel(project.status)),
    field('Responsable', owner ? `${owner.displayName} · ${owner.title}` : 'Sin asignar'),
    field('Creado', formatDate(project.createdAt)),
    field(
      'Última actualización',
      `${formatDateTime(project.updatedAt)} · ${formatRelativeTime(project.updatedAt, now)}`,
    ),
    field('Etiquetas', project.tags.length ? project.tags.join(', ') : 'Sin etiquetas'),
  ];

  const narration = project.documents.find((document) =>
    /contexto|problema/i.test(document.title),
  );

  const blocks: ReportBlock[] = [
    { kind: 'fields', title: 'Identidad del proyecto', fields: identity },
    { kind: 'note', title: 'Descripción', text: project.description, tone: 'info' },
  ];

  if (narration) {
    blocks.push({
      kind: 'note',
      title: `Documento «${narration.title}» (M02)`,
      text: narration.body.replace(/\s+/g, ' ').trim(),
      tone: 'info',
    });
  }

  blocks.push({
    kind: 'table',
    title: 'Equipo autorizado',
    columns: ['Integrante', 'Rol en el proyecto', 'Alta'],
    rows: members,
  });

  blocks.push({
    kind: 'table',
    title: 'Datasets vinculados (M05)',
    columns: ['Dataset', 'Formato', 'Versión', 'Registros', 'Tamaño', 'Estado', 'Acceso'],
    rows: datasets.map((dataset) => [
      dataset.name,
      dataset.format,
      `v${dataset.currentVersion}`,
      formatNumber(dataset.rows),
      formatBytes(dataset.sizeBytes),
      datasetStatusLabel(dataset.status),
      datasetAccessLabel(dataset.access),
    ]),
  });

  blocks.push({
    kind: 'fields',
    title: 'Actividad del proyecto',
    fields: [
      field('Ejecuciones en el alcance', formatNumber(runs)),
      field('Datasets registrados', formatNumber(datasets.length)),
      field('Integrantes', formatNumber(project.members.length), undefined, true),
      field(
        'Documentos de contexto',
        formatNumber(project.documents.length),
        undefined,
        true,
      ),
      field('Acceso al detalle técnico', 'Habilitado', 'ver-tecnico'),
    ],
  });

  return finalize('ficha', blocks);
}

function architectureSummary(
  sources: ReportSources,
  access: ReportAccess,
  field: (label: string, value: string, needs?: ReportCapability, mono?: boolean) => ReportField,
  allJobs: TrainingJob[],
  scopedJobs: TrainingJob[],
  bestRun: TrainingJob | null,
): ReportSection {
  const technical = canReport(access, 'ver-tecnico');
  const byArchitecture = new Map<string, TrainingJob[]>();
  allJobs.forEach((job) => {
    const list = byArchitecture.get(job.architectureName) ?? [];
    list.push(job);
    byArchitecture.set(job.architectureName, list);
  });

  const rows = [...byArchitecture.entries()].map(([name, jobs]) => {
    const sorted = [...jobs].sort((a, b) => Date.parse(b.queuedAt) - Date.parse(a.queuedAt));
    const last = sorted[0];
    const finished = jobs.filter((job) => job.status === 'COMPLETED');
    const best = finished.reduce(
      (acc, job) => (acc === null || job.valAccuracy > acc.valAccuracy ? job : acc),
      null as TrainingJob | null,
    );
    return [
      name,
      familyMeta[last.family].label,
      versionFor(name),
      formatNumber(jobs.length),
      formatNumber(finished.length),
      formatDate(last.queuedAt),
      best ? formatRate(best.valAccuracy, 1) : 'sin métricas',
    ];
  });

  const blocks: ReportBlock[] = [
    {
      kind: 'fields',
      title: 'Familia y versión del proyecto',
      fields: [
        field('Familia declarada', familyMeta[sources.project.family].label),
        field(
          'Arquitecturas con ejecuciones',
          formatNumber(new Set(scopedJobs.map((job) => job.architectureName)).size),
        ),
        field(
          'Mejor ejecución registrada',
          bestRun ? `${bestRun.architectureName} · val_acc ${formatRate(bestRun.valAccuracy, 1)}` : 'Sin ejecuciones completadas',
        ),
      ],
    },
    {
      kind: 'table',
      title: 'Arquitecturas entrenadas (M06)',
      columns: ['Arquitectura', 'Familia', 'Versión', 'Ejecuciones', 'Completadas', 'Último uso', 'Mejor val_acc'],
      rows,
    },
  ];

  if (sources.draft) {
    const computation = computeArchitecture(sources.draft);
    const errors = computation.issues.filter((issue) => issue.severity === 'error').length;
    const warnings = computation.issues.filter((issue) => issue.severity === 'warning').length;

    blocks.push({
      kind: 'fields',
      title: 'Borrador activo en el diseñador (M04)',
      fields: [
        field('Nombre del borrador', sources.draft.name),
        field('Forma de entrada', formatShape(computation.inputShape), undefined, true),
        field('Forma de salida', formatShape(computation.outputShape), undefined, true),
        field('Capas', formatNumber(computation.results.length), undefined, true),
        field('Parámetros totales', formatParams(computation.totalParams), undefined, true),
        field('Incidencias de validación', `${errors} error(es) · ${warnings} aviso(s)`, 'ver-tecnico'),
      ],
    });

    if (technical) {
      blocks.push({
        kind: 'table',
        title: 'Detalle de capas del borrador',
        columns: ['#', 'Capa', 'Configuración', 'Salida', 'Parámetros'],
        rows: computation.results.map((result) => [
          String(result.index + 1),
          result.layer.type,
          layerSettings(result.layer),
          formatShape(result.outputShape),
          formatParams(result.params),
        ]),
      });

      if (computation.issues.length > 0) {
        blocks.push({
          kind: 'list',
          title: 'Incidencias detectadas por el validador',
          items: computation.issues.map((issue) => `${issue.severity}: ${issue.message}`),
        });
      }
    } else {
      blocks.push({
        kind: 'fields',
        title: 'Contenido restringido para su rol',
        fields: [
          field('Capas del borrador', 'no se incluye', 'ver-tecnico'),
          field('Incidencias del validador', 'no se incluyen', 'ver-tecnico'),
        ],
      });
    }
  } else {
    blocks.push({
      kind: 'note',
      title: 'Borrador del diseñador',
      text: 'M04 no tiene un borrador guardado en este navegador. El resumen se limita a las arquitecturas con ejecuciones registradas.',
      tone: 'info',
    });
  }

  blocks.push({
    kind: 'note',
    title: 'Alcance del cálculo',
    text: 'El resumen reproduce la validación que ya ejecutó el backend; la consola no recalcula la red (RN-03).',
    tone: 'info',
  });

  return finalize('arquitectura', blocks);
}

function trainingHistory(
  sources: ReportSources,
  access: ReportAccess,
  field: (label: string, value: string, needs?: ReportCapability, mono?: boolean) => ReportField,
  jobs: TrainingJob[],
  scopeLabel: string,
  bestRun: TrainingJob | null,
): ReportSection {
  const reproduce = canReport(access, 'ver-reproduccion');
  const technical = canReport(access, 'ver-tecnico');
  const gpuSeconds = jobs.reduce((sum, job) => sum + job.durationSeconds, 0);

  const rows = jobs.map((job) => {
    const record = recordFor(job, sources.records);
    return [
      job.id,
      job.endedAt ? formatDateTime(job.endedAt) : `en curso · ${job.progress}\u00a0%`,
      statusMeta[job.status].label,
      `${job.architectureName} · ${record.version}`,
      job.datasetName,
      `${formatNumber(job.epoch)}/${formatNumber(job.epochs)} · lote ${formatNumber(job.batch)}`,
      `${job.optimizer}`,
      reproduce ? formatNumber(record.learningRate, 5) : MASKED,
      reproduce ? String(record.seed) : MASKED,
      job.status === 'COMPLETED' || job.status === 'FAILED'
        ? `${formatRate(job.valAccuracy, 1)} · ${formatNumber(job.valLoss, 4)}`
        : 'pendiente',
      job.durationSeconds > 0 ? formatDuration(job.durationSeconds) : 'sin cómputo',
      job.owner,
      traceNote(job, record, technical),
    ];
  });

  const blocks: ReportBlock[] = [
    {
      kind: 'fields',
      title: 'Cobertura del historial',
      fields: [
        field('Periodo', scopeLabel),
        field('Ejecuciones', formatNumber(jobs.length)),
        field('Completadas', formatNumber(jobs.filter((job) => job.status === 'COMPLETED').length)),
        field('Fallidas', formatNumber(jobs.filter((job) => job.status === 'FAILED').length)),
        field('Canceladas', formatNumber(jobs.filter((job) => job.status === 'CANCELLED').length)),
        field('En curso', formatNumber(jobs.filter((job) => isActive(job.status)).length)),
        field('Tiempo de cómputo acumulado', formatDuration(gpuSeconds)),
      ],
    },
    {
      kind: 'table',
      title: 'Ejecuciones del periodo',
      columns: [
        'Trabajo',
        'Cierre',
        'Estado',
        'Arquitectura · versión',
        'Dataset',
        'Épocas · lote',
        'Optimizador',
        'Tasa de aprendizaje',
        'Semilla',
        'val_acc · val_loss',
        'Duración',
        'Responsable',
        'Trazabilidad',
      ],
      rows,
    },
  ];

  if (bestRun && sources.bestRun?.jobId === bestRun.id && sources.bestRun.points.length > 1) {
    blocks.push({
      kind: 'chart',
      title: `Curva de pérdida y ganancia de la mejor ejecución (${bestRun.id})`,
      model: bestRun.architectureName,
      points: sources.bestRun.points,
    });
  }

  blocks.push({
    kind: 'note',
    title: 'Nota de trazabilidad',
    text: `Cada fila conserva versión, semilla y referencia al dataset (${formatDuration(gpuSeconds)} de cómputo registrado). Un reintento se documenta como trabajo nuevo con su origen, nunca sobrescribiendo el anterior.`,
    tone: 'info',
  });

  if (!reproduce) {
    blocks.push({
      kind: 'note',
      title: 'Campos restringidos',
      text: `Su rol (${access.projectRoleLabel}) no incluye la capacidad «Ver parámetros de reproducción»: la tasa de aprendizaje y la semilla se exportan como «${MASKED}».`,
      tone: 'warning',
    });
  }

  return finalize('historial', blocks);
}

function warningSection(
  sources: ReportSources,
  access: ReportAccess,
  datasets: DatasetRecord[],
  jobs: TrainingJob[],
): ReportSection {
  const checks = reportChecks(sources, datasets, jobs, access);
  const attention = checks.filter((check) => check.level !== 'ok');

  const blocks: ReportBlock[] = [
    {
      kind: 'table',
      title: 'Comprobaciones del informe',
      columns: ['Comprobación', 'Resultado', 'Detalle'],
      rows: checks.map((check) => [check.title, check.levelLabel, check.detail]),
    },
    {
      kind: 'fields',
      title: 'Límites registrados',
      fields: [
        { label: sources.storage.label, value: sources.storage.detail },
        {
          label: 'Retención de bitácora',
          value: 'Los registros de exportación se conservan 30 días en la demo local.',
        },
        {
          label: 'Estado del proyecto',
          value: projectStatusLabel(sources.project.status),
        },
      ],
    },
  ];

  if (attention.length > 0) {
    blocks.push({
      kind: 'note',
      title: 'Advertencias para la revisión',
      text: attention.map((check) => `${check.title}: ${check.detail}`).join(' · '),
      tone: attention.some((check) => check.level === 'error') ? 'danger' : 'warning',
    });
  }

  return finalize('advertencias', blocks);
}

function auditSection(
  sources: ReportSources,
  field: (label: string, value: string, needs?: ReportCapability, mono?: boolean) => ReportField,
): ReportSection {
  const events = sources.events.filter((event) => event.projectId === sources.project.id);
  return finalize('auditoria', [
    {
      kind: 'fields',
      title: 'Resumen de distribución',
      fields: [
        field('Exportaciones registradas', formatNumber(events.length)),
        field(
          'Última exportación',
          events[0] ? `${formatDateTime(events[0].at)} · ${events[0].format}` : 'Sin registros',
        ),
        field('Contenido de la bitácora', 'Metadatos de la acción; nunca datos del dataset (§11).'),
      ],
    },
    {
      kind: 'table',
      title: 'Bitácora de exportaciones',
      columns: ['Fecha', 'Actor', 'Rol', 'Formato', 'Secciones', 'Filas', 'Huella'],
      rows: events.map((event) => [
        formatDateTime(event.at),
        event.actor.name,
        event.actor.projectRoleLabel,
        event.format,
        event.sections.join(', '),
        formatNumber(event.rows),
        `${event.fingerprint.slice(0, 8)}…`,
      ]),
    },
  ]);
}

function finalize(id: ReportSectionId, blocks: ReportBlock[]): ReportSection {
  const meta = SECTION_BY_ID.get(id);
  return {
    id,
    label: meta?.label ?? id,
    module: meta?.module ?? '',
    blocks,
    rows: blocks.reduce((sum, block) => sum + blockRows(block), 0),
  };
}

/* ------------------------------------------------------------------- comprobaciones */

export interface ReportCheck {
  id: string;
  level: 'ok' | 'warning' | 'error';
  levelLabel: string;
  title: string;
  detail: string;
  module: string;
}

const LEVEL_LABEL: Record<ReportCheck['level'], string> = {
  ok: 'Sin observación',
  warning: 'Requiere atención',
  error: 'Bloqueante',
};

export function reportChecks(
  sources: ReportSources,
  datasets: DatasetRecord[],
  jobs: TrainingJob[],
  access: ReportAccess,
): ReportCheck[] {
  const checks: ReportCheck[] = [];
  const project = sources.project;

  checks.push({
    id: 'status',
    level: project.status === 'ACTIVE' ? 'ok' : 'warning',
    levelLabel: LEVEL_LABEL[project.status === 'ACTIVE' ? 'ok' : 'warning'],
    title: 'Estado del proyecto',
    detail:
      project.status === 'ACTIVE'
        ? `Proyecto activo desde ${formatDate(project.createdAt)}.`
        : `El proyecto está ${projectStatusLabel(project.status).toLowerCase()}: el informe se emite a efectos de trazabilidad.`,
    module: 'M02',
  });

  if (datasets.length === 0) {
    checks.push({
      id: 'datasets',
      level: 'warning',
      levelLabel: LEVEL_LABEL.warning,
      title: 'Datasets vinculados',
      detail: 'M05 no tiene datasets registrados para este proyecto: la reproducibilidad queda incompleta.',
      module: 'M05',
    });
  } else {
    datasets.forEach((dataset) => {
      const split = validateSplit(dataset.split);
      const usable = dataset.status === 'READY';
      const audit = canReport(access, 'ver-tecnico') ? auditDataset(dataset) : [];
      const failing = audit.filter((item) => !item.ok);
      const level: ReportCheck['level'] = !split.ok
        ? 'error'
        : !usable || failing.length > 0
          ? 'warning'
          : 'ok';
      checks.push({
        id: `dataset-${dataset.id}`,
        level,
        levelLabel: LEVEL_LABEL[level],
        title: `Dataset ${dataset.name}`,
        detail: [
          `v${dataset.currentVersion} · ${formatBytes(dataset.sizeBytes)} · ${formatNumber(dataset.rows)} registros`,
          split.message,
          usable ? 'Disponible para entrenamiento' : `Estado ${datasetStatusLabel(dataset.status).toLowerCase()}`,
          ...failing.map((item) => `${item.label}: ${item.detail}`),
        ].join(' · '),
        module: 'M05',
      });
    });
  }

  const closed = jobs.filter((job) => !isActive(job.status));
  const failedRuns = jobs.filter((job) => job.status === 'FAILED');
  const cancelled = jobs.filter((job) => job.status === 'CANCELLED');
  checks.push({
    id: 'runs',
    level: failedRuns.length > 0 ? 'warning' : 'ok',
    levelLabel: LEVEL_LABEL[failedRuns.length > 0 ? 'warning' : 'ok'],
    title: 'Resultado de las ejecuciones',
    detail:
      jobs.length === 0
        ? 'Sin ejecuciones en el periodo seleccionado.'
        : `${formatNumber(closed.length)} cerradas de ${formatNumber(jobs.length)}; ${formatNumber(failedRuns.length)} fallidas, ${formatNumber(cancelled.length)} canceladas.`,
    module: 'M06',
  });

  if (failedRuns.length > 0) {
    checks.push({
      id: 'failures',
      level: 'warning',
      levelLabel: LEVEL_LABEL.warning,
      title: 'Fallos con mensaje controlado',
      detail: canReport(access, 'ver-tecnico')
        ? failedRuns
            .map((job) => {
              const record = recordFor(job, sources.records);
              const error = record.logs.find((entry) => entry.level === 'error');
              return `${job.id}: ${error?.text ?? 'sin bitácora técnica'}`;
            })
            .join(' · ')
        : `Se registraron ${formatNumber(failedRuns.length)} fallos; el detalle técnico está restringido para su rol.`,
      module: 'M06 · §12',
    });
  }

  const cancelledWithReason = cancelled.filter((job) => recordFor(job, sources.records).motivo);
  if (cancelled.length > 0) {
    checks.push({
      id: 'cancellations',
      level: cancelledWithReason.length === cancelled.length ? 'ok' : 'warning',
      levelLabel: LEVEL_LABEL[cancelledWithReason.length === cancelled.length ? 'ok' : 'warning'],
      title: 'Cancelaciones con motivo (RN-05)',
      detail: `${formatNumber(cancelledWithReason.length)} de ${formatNumber(cancelled.length)} cancelaciones registran el motivo confirmado por el worker.`,
      module: 'M06',
    });
  }

  const retried = jobs.filter((job) => recordFor(job, sources.records).retryOf);
  if (retried.length > 0) {
    checks.push({
      id: 'retries',
      level: 'ok',
      levelLabel: LEVEL_LABEL.ok,
      title: 'Trazabilidad de reintentos',
      detail: retried
        .map((job) => `${job.id} ← ${recordFor(job, sources.records).retryOf}`)
        .join(' · '),
      module: 'M06',
    });
  }

  if (sources.draft) {
    const issues = computeArchitecture(sources.draft).issues;
    const errors = issues.filter((issue) => issue.severity === 'error').length;
    checks.push({
      id: 'draft',
      level: errors > 0 ? 'error' : issues.length > 0 ? 'warning' : 'ok',
      levelLabel: LEVEL_LABEL[errors > 0 ? 'error' : issues.length > 0 ? 'warning' : 'ok'],
      title: 'Validación de la arquitectura (M04)',
      detail: canReport(access, 'ver-tecnico')
        ? errors > 0
          ? `${formatNumber(errors)} error(es) en el borrador «${sources.draft.name}»; la validación de forma es responsabilidad del backend.`
          : `${formatNumber(issues.length)} aviso(s) y ${formatNumber(computeArchitecture(sources.draft).results.length)} capas válidas.`
        : `El borrador «${sources.draft.name}» tiene ${formatNumber(errors)} error(es); el detalle técnico está restringido para su rol.`,
      module: 'M04',
    });
  }

  checks.push({
    id: 'security',
    level: 'ok',
    levelLabel: LEVEL_LABEL.ok,
    title: 'Alcance y confidencialidad',
    detail: `Informe limitado a ${sources.project.id}. Las ejecuciones de otros proyectos quedan fuera aunque compartan worker.`,
    module: 'M10',
  });

  return checks;
}

/** Acceso ficticio con todas las capacidades: sirve para contar avisos sin depender del actor. */
const TECHNICAL_ACCESS: ReportAccess = {
  actorRole: 'engineer',
  projectRole: 'global-admin',
  projectRoleLabel: 'Vista técnica completa',
  allowed: CAPABILITY_RULES.map((rule) => rule.id),
  denied: [],
  canView: true,
};

function countWarnings(
  sources: ReportSources,
  datasets: DatasetRecord[],
  jobs: TrainingJob[],
): number {
  return reportChecks(sources, datasets, jobs, TECHNICAL_ACCESS).filter(
    (check) => check.level !== 'ok',
  ).length;
}

/* --------------------------------------------------------------------- exportación */

const CRLF = '\r\n';
/** Marcado de bytes para que Excel lea la hoja de cálculo en UTF-8. */
const BOM = String.fromCharCode(0xfeff);

/** RFC4180 con guarda contra inyección de fórmulas al abrir el archivo en una hoja de cálculo. */
export function csvCell(value: string): string {
  const raw = value ?? '';
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',');
}

export function toCsv(document: ReportDocument): string {
  const lines: string[] = [
    '# NEUROLAB ENTERPRISE - INFORME DE PROYECTO',
    csvRow(['campo', 'valor']),
    csvRow(['Proyecto', `${document.project.id} ${document.project.name}`]),
    csvRow(['Descripción', document.project.description]),
    csvRow(['Estado', projectStatusLabel(document.project.status)]),
    csvRow(['Familia', familyMeta[document.project.family].label]),
    csvRow(['Generado', document.generatedAt]),
    csvRow(['Solicitante', `${document.actor.name} (${document.actor.roleLabel} / ${document.actor.projectRoleLabel})`]),
    csvRow(['Alcance temporal', document.scopeLabel]),
    csvRow(['Origen de datos', document.dataSource === 'demo' ? 'demostración' : 'API de la plataforma']),
    csvRow(['Secciones', document.sections.map((section) => section.label).join(' | ') || 'ninguna']),
    csvRow(['Campos restringidos', document.masked.length ? document.masked.join(' | ') : 'ninguno']),
    csvRow([
      'Totales',
      `ejecuciones ${document.totals.runs}, completadas ${document.totals.completed}, fallidas ${document.totals.failed}, canceladas ${document.totals.cancelled}`,
    ]),
  ];

  document.sections.forEach((section) => {
    lines.push('');
    lines.push(`# SECCION: ${section.label} (${section.module})`);
    section.blocks.forEach((block) => {
      lines.push('');
      if (block.kind === 'fields') {
        lines.push(`# ${block.title}`);
        lines.push(csvRow(['campo', 'valor']));
        block.fields.forEach((item) => lines.push(csvRow([item.label, item.value])));
        return;
      }
      if (block.kind === 'table') {
        lines.push(`# ${block.title}`);
        lines.push(csvRow(block.columns));
        block.rows.forEach((row) => lines.push(csvRow(row)));
        return;
      }
      if (block.kind === 'list') {
        lines.push(`# ${block.title}`);
        lines.push(csvRow(['elemento']));
        block.items.forEach((item) => lines.push(csvRow([item])));
        return;
      }
      if (block.kind === 'chart') {
        lines.push(`# ${block.title} (${block.model})`);
        lines.push(csvRow(['epoca', 'loss', 'val_loss', 'accuracy', 'val_accuracy']));
        block.points.forEach((point) =>
          lines.push(
            csvRow([
              String(point.epoch),
              point.loss.toFixed(4),
              point.valLoss.toFixed(4),
              point.accuracy.toFixed(4),
              point.valAccuracy.toFixed(4),
            ]),
          ),
        );
        return;
      }
      lines.push(`# ${block.title}: ${block.text.replace(/\s+/g, ' ').trim()}`);
    });
  });

  lines.push('');
  lines.push('# FIN DEL INFORME');
  return `${BOM}${lines.join(CRLF)}${CRLF}`;
}

export function reportFileName(document: ReportDocument, format: ReportFormat, now: number): string {
  const slug = `${document.project.id}-${document.project.name}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const stamp = new Date(now).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  return `neurolab-informe-${slug}-${stamp}.${format.toLowerCase()}`;
}

/**
 * Huella determinista del archivo exportado. La demo no tiene backend, así que se calcula en la
 * consola con FNV-1a extendido: sirve para comparar dos descargas, no para firmar legalmente.
 */
export function fingerprint(content: string): string {
  let out = '';
  for (let seed = 0; seed < 4; seed += 1) {
    let hash = 0x811c9dc5 ^ (seed * 0x9e3779b9);
    for (let index = 0; index < content.length; index += 1) {
      hash ^= content.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    out += hash.toString(16).padStart(8, '0');
  }
  return out;
}

/** Título que verá el diálogo de impresión del navegador; también nombra el PDF sugerido. */
export function printTitle(document: ReportDocument): string {
  return `NeuroLab · Informe ${document.project.id} ${document.project.name}`;
}

export function csvSummary(document: ReportDocument): string[] {
  const out: string[] = [
    `${document.project.id} · ${document.project.name}`,
    `${document.sections.length} sección(es): ${document.sections.map((section) => section.label).join(', ') || 'ninguna'}`,
    `${formatNumber(document.sections.reduce((sum, section) => sum + section.rows, 0))} filas de datos`,
  ];
  if (document.masked.length > 0) {
    out.push(`Campos restringidos por rol: ${document.masked.join(', ')}`);
  }
  return out;
}

/* -------------------------------------------------------------------- bitácora */

export interface ExportEvent {
  id: string;
  at: string;
  actor: { id: string; name: string; roleLabel: string; projectRoleLabel: string };
  projectId: string;
  projectName: string;
  format: ReportFormat;
  sections: ReportSectionId[];
  rows: number;
  bytes: number;
  fingerprint: string;
  masked: string[];
  scopeLabel: string;
}

const EXPORT_KEY = 'neurolab.reports.exports.v1';
const EXPORT_CAP = 40;

function isExportEvent(value: unknown): value is ExportEvent {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.at === 'string' &&
    typeof record.projectId === 'string' &&
    typeof record.format === 'string' &&
    Array.isArray(record.sections)
  );
}

export function loadExportEvents(): ExportEvent[] {
  try {
    const raw = localStorage.getItem(EXPORT_KEY);
    if (!raw) return seedEvents();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedEvents();
    return parsed.every(isExportEvent) ? (parsed as ExportEvent[]) : seedEvents();
  } catch {
    return seedEvents();
  }
}

export function saveExportEvents(events: ExportEvent[]): void {
  try {
    localStorage.setItem(EXPORT_KEY, JSON.stringify(events.slice(0, EXPORT_CAP)));
  } catch {
    /* La bitácora local es una caché de la demo; si el navegador la rechaza, no se pierde el informe. */
  }
}

export function recordExport(
  events: ExportEvent[],
  event: Omit<ExportEvent, 'id' | 'at'>,
  now: number,
): { events: ExportEvent[]; event: ExportEvent } {
  const created: ExportEvent = {
    ...event,
    id: nextEventId(events),
    at: new Date(now).toISOString(),
  };
  const next = [created, ...events].slice(0, EXPORT_CAP);
  saveExportEvents(next);
  return { events: next, event: created };
}

function nextEventId(events: ExportEvent[]): string {
  const highest = events.reduce((max, event) => {
    const numeric = Number.parseInt(event.id.replace(/\D+/g, ''), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 5000);
  return `EXP-${highest + 1}`;
}

/** Dos registros de ejemplo para que la trazabilidad no nazca vacía. */
function seedEvents(): ExportEvent[] {
  const now = Date.now();
  return [
    {
      id: 'EXP-5002',
      at: new Date(now - 3 * 86_400_000).toISOString(),
      actor: {
        id: 'USR-218',
        name: 'Rosa Medina Vega',
        roleLabel: 'Revisor',
        projectRoleLabel: 'Revisor',
      },
      projectId: 'PRJ-118',
      projectName: 'Scoring de riesgo de fuga',
      format: 'PDF',
      sections: ['ficha', 'arquitectura', 'historial'],
      rows: 34,
      bytes: 188_420,
      fingerprint: 'a91f4c77d0b24e5c8f31a6d0c2e4b7f9a1d3c5e7f90b2d4e6a8c0e2f468ace0',
      masked: ['Incidencias de validación', 'Capas del borrador', 'Incidencias del validador'],
      scopeLabel: 'Últimos 90 días',
    },
    {
      id: 'EXP-5001',
      at: new Date(now - 9 * 86_400_000).toISOString(),
      actor: {
        id: 'USR-212',
        name: 'Luis Paredes Soto',
        roleLabel: 'Ingeniero de IA',
        projectRoleLabel: 'Ingeniero de IA',
      },
      projectId: 'PRJ-121',
      projectName: 'Detección de fraude transaccional',
      format: 'CSV',
      sections: ['historial'],
      rows: 12,
      bytes: 8_940,
      fingerprint: '5c8e1a3b7d9f2046a8c0e2f4b6d8fac0e2f4a6b8d0e2f4a6c8e0f2468ace1357',
      masked: [],
      scopeLabel: 'Últimos 30 días',
    },
  ];
}

/* ------------------------------------------------------------------------ etiquetas */

function projectStatusLabel(status: ProjectRecord['status']): string {
  return { ACTIVE: 'Activo', DRAFT: 'Borrador', ARCHIVED: 'Archivado' }[status];
}

function datasetStatusLabel(status: DatasetRecord['status']): string {
  return { READY: 'Listo', VALIDATING: 'Validando', DRAFT: 'Borrador', QUARANTINED: 'En cuarentena' }[status];
}

function datasetAccessLabel(access: DatasetRecord['access']): string {
  return { PROJECT: 'Proyecto', ENGINEERS: 'Ingeniería', OWNER: 'Responsable' }[access];
}

function layerSettings(layer: ArchitectureConfig['layers'][number]): string {
  const parts: string[] = [];
  if (layer.units !== undefined) parts.push(`${layer.units} ud.`);
  if (layer.filters !== undefined) parts.push(`${layer.filters} filtros`);
  if (layer.kernelSize !== undefined) parts.push(`kernel ${layer.kernelSize}`);
  if (layer.poolSize !== undefined) parts.push(`pool ${layer.poolSize}`);
  if (layer.dropout !== undefined) parts.push(`dropout ${formatNumber(layer.dropout * 100, 0)}\u00a0%`);
  if (layer.activation) parts.push(layer.activation);
  return parts.join(' · ') || 'sin parámetros';
}

function traceNote(job: TrainingJob, record: RunRecord, technical: boolean): string {
  const notes: string[] = [];
  if (record.retryOf) notes.push(`reintento de ${record.retryOf}`);
  if (record.origin === 'plataforma') notes.push('API M01');
  if (job.cancelRequested && job.status !== 'CANCELLED') notes.push('cancelación solicitada');
  if (job.status === 'CANCELLED' && record.motivo) notes.push(technical ? record.motivo : 'cancelado con motivo registrado');
  if (record.priority !== 'NORMAL') notes.push(`prioridad ${PRIORITY_LABEL[record.priority].toLowerCase()}`);
  return notes.join(' · ') || '—';
}
