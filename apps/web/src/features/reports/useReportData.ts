import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Actor } from '@/types/domain';
import type { ProjectRecord } from '@/types/project';
import { dataSource, fetchJobCurves } from '@/lib/api/dashboard';
import { directoryUsers } from '@/lib/mock/projects';
import { formatBytes } from '@/features/datasets/model';
import { loadDraft } from '@/features/architectures/model';
import { loadDatasets } from '@/features/datasets/model';
import { loadProjects } from '@/features/projects/model';
import { useTrainingRuns } from '@/features/training/useTrainingRuns';
import {
  DEFAULT_SCOPE,
  REPORT_SECTIONS,
  buildReport,
  canReport,
  fingerprint,
  filterJobs,
  loadExportEvents,
  pickBestRun,
  printTitle,
  rangeBounds,
  recordExport,
  reportFileName,
  resolveAccess,
  toCsv,
} from '@/features/reports/model';
import type {
  ExportEvent,
  ReportAccess,
  ReportDocument,
  ReportFormat,
  ReportScope,
  ReportSectionId,
  ReportSources,
} from '@/features/reports/model';

/* M09 sólo lee: reúne lo que M02, M04, M05 y M06 ya publican, aplica el rol del actor y produce el
   archivo. Ningún dato de entrenamiento viaja a un servicio externo: la exportación es local. */

const SECTION_IDS = REPORT_SECTIONS.map((section) => section.id);
const DEFAULT_SELECTED = REPORT_SECTIONS.filter((section) => section.defaultOn).map((section) => section.id);

export interface ReportOutcome {
  ok: boolean;
  tone: 'success' | 'info' | 'danger';
  text: string;
}

/** Huella del almacenamiento local que alimenta el informe: los límites reales de la consola. */
function storageFootprint(): { label: string; detail: string } {
  const keys = [
    'neurolab.projects.v1',
    'neurolab.datasets.v1',
    'neurolab.training.v1',
    'neurolab.architectures.draft.v1',
    'neurolab.reports.exports.v1',
  ];
  let bytes = 0;
  let used = 0;
  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        used += 1;
        bytes += raw.length;
      }
    } catch {
      /* Un navegador en modo privado puede bloquear la lectura; el informe sigue siendo válido. */
    }
  });
  return {
    label: 'Memoria de la consola',
    detail:
      used === 0
        ? 'Sin caché local: el informe se construye sólo con los datos que publica la plataforma.'
        : `${formatBytes(bytes)} repartidos en ${used} clave(s) de lectura; el informe no duplica los datasets.`,
  };
}

export interface ReportModel {
  actor: Actor;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;

  projects: ProjectRecord[];
  project: ProjectRecord | null;
  projectId: string;
  selectProject: (id: string) => void;
  accessible: Array<{ id: string; name: string; roleLabel: string; runs: number }>;

  scope: ReportScope;
  setScope: (changes: Partial<ReportScope>) => void;
  selected: ReportSectionId[];
  toggleSection: (id: ReportSectionId) => void;
  selectAllSections: () => void;
  clearSections: () => void;

  /** `self` = sesión real. Otro id simula ese rol en pantalla; la exportación queda cerrada. */
  previewUserId: string;
  setPreviewUser: (id: string) => void;
  previewing: boolean;
  access: ReportAccess | null;
  sessionAccess: ReportAccess | null;

  document: ReportDocument | null;
  problem: string | null;
  bestJobId: string | null;
  curvesLoading: boolean;

  canExport: (format: ReportFormat) => boolean;
  exportCsv: () => ReportOutcome;
  exportPdf: () => ReportOutcome;
  events: ExportEvent[];
  lastEvent: ExportEvent | null;

  notice: ReportOutcome | null;
  dismissNotice: () => void;
  /** Publica el aviso inferior: lo usan el diálogo de exportación y las acciones de la página. */
  notify: (outcome: ReportOutcome | null) => void;
}

export function useReportData(): ReportModel {
  const run = useTrainingRuns();
  const actor = run.actor;

  const [projects] = useState<ProjectRecord[]>(() => loadProjects());
  const [datasets] = useState(() => loadDatasets());
  const [draft] = useState(() => loadDraft());
  const [storage] = useState(() => storageFootprint());

  const [projectId, setProjectId] = useState<string>(
    () => projects.find((item) => resolveAccess(actor, item).canView)?.id ?? projects[0]?.id ?? '',
  );
  const [scope, setScopeState] = useState<ReportScope>(DEFAULT_SCOPE);
  const [selected, setSelected] = useState<ReportSectionId[]>(DEFAULT_SELECTED);
  const [previewUserId, setPreviewUser] = useState<string>('self');
  const [events, setEvents] = useState<ExportEvent[]>(() => loadExportEvents());
  const [lastEvent, setLastEvent] = useState<ExportEvent | null>(null);
  const [notice, setNotice] = useState<ReportOutcome | null>(null);
  const [curves, setCurves] = useState<ReportSources['bestRun']>(null);
  const noticeTimer = useRef<number | null>(null);

  const show = useCallback((outcome: ReportOutcome | null) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice(outcome);
    if (outcome) noticeTimer.current = window.setTimeout(() => setNotice(null), 8000);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projectId, projects],
  );

  const previewActor = useMemo<Actor>(() => {
    if (previewUserId === 'self') return actor;
    const user = directoryUsers.find((item) => item.id === previewUserId);
    if (!user) return actor;
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      initials: user.initials,
    };
  }, [actor, previewUserId]);

  const sessionAccess = useMemo(
    () => (project ? resolveAccess(actor, project) : null),
    [actor, project],
  );
  const access = useMemo(
    () => (project ? resolveAccess(previewActor, project) : null),
    [previewActor, project],
  );

  /* Reloj del alcance: se refresca cada 30 s para que «hasta hoy» y las etiquetas relativas
     no queden congeladas mientras la consola está abierta. */
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const bounds = useMemo(() => rangeBounds(scope, clock), [clock, scope]);

  /* La mejor ejecución del alcance decide qué curva acompaña el historial. */
  const bestJob = useMemo(
    () => (project && access?.canView ? pickBestRun(filterJobs(run.jobs, project.id, bounds)) : null),
    [access, bounds, project, run.jobs],
  );
  const bestJobId = bestJob?.id ?? null;

  useEffect(() => {
    if (!bestJobId) {
      setCurves(null);
      return;
    }
    const controller = new AbortController();
    setCurves(null);
    fetchJobCurves(bestJobId, controller.signal)
      .then((job) => {
        if (!controller.signal.aborted) setCurves({ jobId: job.jobId, points: job.points });
      })
      .catch(() => {
        /* Una curva que no llega no invalida el informe: la sección simplemente no la muestra. */
      });
    return () => controller.abort();
  }, [bestJobId]);

  const sources = useMemo<ReportSources | null>(() => {
    if (!project) return null;
    return {
      project,
      users: directoryUsers,
      datasets,
      jobs: run.jobs,
      records: run.records,
      draft,
      events,
      bestRun: curves && curves.jobId === bestJobId ? curves : null,
      dataSource,
      storage,
    };
  }, [bestJobId, curves, datasets, draft, events, project, run.jobs, run.records, storage]);

  const built = useMemo(
    () =>
      sources
        ? buildReport(
            previewActor,
            sources,
            scope,
            SECTION_IDS.filter((id) => selected.includes(id)),
            clock,
          )
        : null,
    [clock, previewActor, scope, selected, sources],
  );

  const accessible = useMemo(
    () =>
      projects
        .filter((item) => resolveAccess(actor, item).canView)
        .map((item) => ({
          id: item.id,
          name: item.name,
          roleLabel: resolveAccess(actor, item).projectRoleLabel,
          runs: filterJobs(run.jobs, item.id, bounds).length,
        })),
    [actor, bounds, projects, run.jobs],
  );

  const selectProject = useCallback((id: string) => {
    setProjectId(id);
    setPreviewUser('self');
  }, []);

  const setScope = useCallback((changes: Partial<ReportScope>) => {
    setScopeState((current) => ({ ...current, ...changes }));
  }, []);

  const toggleSection = useCallback((id: ReportSectionId) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const selectAllSections = useCallback(() => setSelected(SECTION_IDS), []);
  const clearSections = useCallback(() => setSelected([]), []);

  const blockedByPreview = previewUserId !== 'self';

  const canExport = useCallback(
    (format: ReportFormat) => {
      if (!built || built.problem || built.document.sections.length === 0) return false;
      if (blockedByPreview) return false;
      if (!sessionAccess) return false;
      return canReport(sessionAccess, format === 'CSV' ? 'exportar-csv' : 'exportar-pdf');
    },
    [blockedByPreview, built, sessionAccess],
  );

  const commitExport = useCallback(
    (format: ReportFormat, document: ReportDocument, content: string, bytes: number): ExportEvent => {
      const result = recordExport(
        events,
        {
          actor: {
            id: actor.id,
            name: document.actor.name,
            roleLabel: document.actor.roleLabel,
            projectRoleLabel: document.actor.projectRoleLabel,
          },
          projectId: document.project.id,
          projectName: document.project.name,
          format,
          sections: document.included,
          rows: document.sections.reduce((sum, section) => sum + section.rows, 0),
          bytes,
          fingerprint: fingerprint(content),
          masked: document.masked,
          scopeLabel: document.scopeLabel,
        },
        Date.now(),
      );
      setEvents(result.events);
      setLastEvent(result.event);
      return result.event;
    },
    [actor, events],
  );

  const exportCsv = useCallback((): ReportOutcome => {
    if (!built?.document.sections.length || built.problem) {
      return { ok: false, tone: 'danger', text: 'No hay un informe autorizado con contenido que exportar.' };
    }
    if (blockedByPreview) {
      return { ok: false, tone: 'danger', text: 'La simulación de otro rol no descarga archivos: vuelva a la sesión real para exportar.' };
    }
    if (!canExport('CSV')) {
      return { ok: false, tone: 'danger', text: 'Su rol en este proyecto permite consultar el informe, pero no distribuirlo (§11).' };
    }
    const document = built.document;
    const csv = toCsv(document);
    const fileName = reportFileName(document, 'CSV', Date.now());
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      const event = commitExport('CSV', document, csv, blob.size);
      return {
        ok: true,
        tone: 'success',
        text: `${fileName} · ${formatBytes(blob.size)} · registrado en la bitácora como ${event.id}.`,
      };
    } catch {
      return { ok: false, tone: 'danger', text: 'El navegador bloqueó la descarga. Revise los permisos de descarga del sitio.' };
    }
  }, [blockedByPreview, built, canExport, commitExport]);

  const exportPdf = useCallback((): ReportOutcome => {
    if (!built?.document.sections.length || built.problem) {
      return { ok: false, tone: 'danger', text: 'No hay un informe autorizado con contenido que exportar.' };
    }
    if (blockedByPreview) {
      return { ok: false, tone: 'danger', text: 'La simulación de otro rol no genera PDF: vuelva a la sesión real para exportar.' };
    }
    if (!canExport('PDF')) {
      return {
        ok: false,
        tone: 'danger',
        text: 'El PDF tiene valor de aprobación: lo exportan la responsabilidad del proyecto, la revisión o la administración.',
      };
    }
    const document = built.document;
    const suggested = reportFileName(document, 'PDF', Date.now());
    const previous = window.document.title;
    const event = commitExport(
      'PDF',
      document,
      [document.generatedAt, document.included.join(','), document.scopeLabel, document.masked.join(',')].join('|'),
      0,
    );
    const restore = () => {
      window.document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.document.title = printTitle(document);
    window.print();
    /* Si el diálogo de impresión se cancela sin emitir afterprint, el título se restablece solo. */
    window.setTimeout(restore, 2000);
    return {
      ok: true,
      tone: 'success',
      text: `Vista de impresión abierta. Elija «Guardar como PDF» y conserve el nombre sugerido (${suggested}); la acción quedó registrada como ${event.id}.`,
    };
  }, [blockedByPreview, built, canExport, commitExport]);

  const dismissNotice = useCallback(() => show(null), [show]);

  return {
    actor,
    status: run.status,
    error: run.error,
    lastUpdated: run.lastUpdated,
    refresh: run.refresh,
    projects,
    project,
    projectId,
    selectProject,
    accessible,
    scope,
    setScope,
    selected,
    toggleSection,
    selectAllSections,
    clearSections,
    previewUserId,
    setPreviewUser,
    previewing: blockedByPreview,
    access,
    sessionAccess,
    document: built?.document ?? null,
    problem: built?.problem ?? null,
    bestJobId,
    curvesLoading: Boolean(bestJobId) && curves === null,
    canExport,
    exportCsv,
    exportPdf,
    events,
    lastEvent,
    notice,
    dismissNotice,
    notify: show,
  };
}
