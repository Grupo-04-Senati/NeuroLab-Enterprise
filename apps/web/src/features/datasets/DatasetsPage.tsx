import { useEffect, useMemo, useState } from 'react';
import type { DatasetRecord } from '@/types/dataset';
import { datasetProjects, seedDatasets, STORAGE_LIMIT_BYTES } from '@/lib/mock/datasets';
import { demoActor } from '@/lib/session';
import { toneForUsage } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Meter } from '@/components/ui/Progress';
import {
  checksumFor,
  formatBytes,
  isDatasetUsable,
  nextDatasetId,
  type DatasetFilter,
} from '@/features/datasets/model';
import { DatasetCatalog } from '@/features/datasets/DatasetCatalog';
import { DatasetDetail } from '@/features/datasets/DatasetDetail';
import { DatasetFormDialog, type DatasetFormPayload } from '@/features/datasets/DatasetFormDialog';
import { DeleteDatasetDialog } from '@/features/datasets/DeleteDatasetDialog';

const STORAGE_KEY = 'neurolab.datasets.v1';
const VERSION_LIMIT = 60;

type DialogState =
  | { kind: 'create' }
  | { kind: 'version'; dataset: DatasetRecord }
  | { kind: 'delete'; dataset: DatasetRecord }
  | null;

interface Notice {
  tone: 'success' | 'info';
  text: string;
}

function readCatalog(): DatasetRecord[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.status === 'string' &&
        Array.isArray(candidate.versions) &&
        typeof candidate.split === 'object'
      );
    });
    return valid ? (parsed as DatasetRecord[]) : null;
  } catch {
    return null;
  }
}

function matches(dataset: DatasetRecord, term: string): boolean {
  if (!term.trim()) return true;
  const needle = term.trim().toLowerCase();
  return [dataset.name, dataset.id, dataset.project, dataset.format, dataset.owner, ...dataset.tags]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetRecord[]>(() => readCatalog() ?? seedDatasets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DatasetFilter>('ALL');
  const [term, setTerm] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
    } catch {
      /* El almacenamiento del navegador es solo una caché de la demo. */
    }
  }, [datasets]);

  useEffect(() => {
    if (selectedId && datasets.some((dataset) => dataset.id === selectedId)) return;
    setSelectedId(datasets[0]?.id ?? null);
  }, [datasets, selectedId]);

  const counts = useMemo<Record<DatasetFilter, number>>(
    () => ({
      ALL: datasets.length,
      READY: datasets.filter((dataset) => dataset.status === 'READY').length,
      VALIDATING: datasets.filter((dataset) => dataset.status === 'VALIDATING').length,
      DRAFT: datasets.filter((dataset) => dataset.status === 'DRAFT').length,
      QUARANTINED: datasets.filter((dataset) => dataset.status === 'QUARANTINED').length,
    }),
    [datasets],
  );

  const filtered = useMemo(
    () =>
      datasets.filter(
        (dataset) => (filter === 'ALL' || dataset.status === filter) && matches(dataset, term),
      ),
    [datasets, filter, term],
  );

  const selected = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedId) ?? null,
    [datasets, selectedId],
  );

  const summary = useMemo(() => {
    const totalBytes = datasets.reduce((acc, dataset) => acc + dataset.sizeBytes, 0);
    const totalVersions = datasets.reduce((acc, dataset) => acc + dataset.versions.length, 0);
    const pending = datasets.filter(
      (dataset) => dataset.status === 'VALIDATING' || dataset.status === 'QUARANTINED',
    ).length;
    const usable = datasets.filter(isDatasetUsable).length;
    return {
      totalBytes,
      totalVersions,
      pending,
      usable,
      projects: new Set(datasets.map((dataset) => dataset.projectId)).size,
      quarantined: counts.QUARANTINED,
    };
  }, [datasets, counts.QUARANTINED]);

  const handleCreate = (payload: DatasetFormPayload) => {
    const id = nextDatasetId(datasets);
    const project = datasetProjects.find((item) => item.id === payload.projectId);
    const now = new Date().toISOString();
    const record: DatasetRecord = {
      id,
      name: payload.name,
      projectId: payload.projectId,
      project: project?.name ?? 'Proyecto sin nombre',
      format: payload.format,
      description: payload.description || 'Sin descripción adicional.',
      tags: payload.tags,
      license: payload.license,
      privacy: payload.privacy,
      access: payload.access,
      status: 'READY',
      currentVersion: 1,
      versions: [
        {
          version: 1,
          createdAt: now,
          author: demoActor.displayName,
          sizeBytes: payload.sizeBytes,
          rows: payload.rows,
          status: 'READY',
          note: `Carga inicial · ${payload.fileName}`,
          checksum: checksumFor(`${id}:1:${payload.fileName}:${now}`),
        },
      ],
      split: payload.split,
      rows: payload.rows,
      sizeBytes: payload.sizeBytes,
      updatedAt: now,
      owner: demoActor.displayName,
    };

    setDatasets((previous) => [record, ...previous]);
    setSelectedId(id);
    setFilter('ALL');
    setTerm('');
    setDialog(null);
    setNotice({
      tone: 'success',
      text: `${record.id} · ${record.name} quedó registrado como v1 con formato, tamaño y particiones validados.`,
    });
  };

  const handleVersion = (target: DatasetRecord, payload: DatasetFormPayload) => {
    const now = new Date().toISOString();
    const nextVersion = target.currentVersion + 1;
    setDatasets((previous) =>
      previous.map((dataset) =>
        dataset.id === target.id
          ? {
              ...dataset,
              format: payload.format,
              license: payload.license,
              privacy: payload.privacy,
              access: payload.access,
              description: payload.description || dataset.description,
              tags: payload.tags.length > 0 ? payload.tags : dataset.tags,
              status: 'READY',
              currentVersion: nextVersion,
              split: payload.split,
              rows: payload.rows,
              sizeBytes: payload.sizeBytes,
              updatedAt: now,
              versions: [
                {
                  version: nextVersion,
                  createdAt: now,
                  author: demoActor.displayName,
                  sizeBytes: payload.sizeBytes,
                  rows: payload.rows,
                  status: 'READY',
                  note: `Nueva versión · ${payload.fileName}`,
                  checksum: checksumFor(`${target.id}:${nextVersion}:${payload.fileName}:${now}`),
                },
                ...dataset.versions,
              ],
            }
          : dataset,
      ),
    );
    setDialog(null);
    setNotice({
      tone: 'success',
      text: `${target.name}: v${nextVersion} publicada y validada. La v${target.currentVersion} se conserva sin cambios.`,
    });
  };

  const handleDelete = (target: DatasetRecord) => {
    const remaining = datasets.filter((dataset) => dataset.id !== target.id);
    setDatasets(remaining);
    if (selectedId === target.id) setSelectedId(remaining[0]?.id ?? null);
    setDialog(null);
    setNotice({
      tone: 'info',
      text: `${target.id} · ${target.name} se retiró del catálogo. Los objetos se purgan en 30 días; la auditoría conserva el evento.`,
    });
  };

  const handleReset = () => {
    setDatasets(seedDatasets);
    setSelectedId(seedDatasets[0]?.id ?? null);
    setFilter('ALL');
    setTerm('');
    setDialog(null);
    setNotice({ tone: 'info', text: 'Catálogo demo restaurado con los ocho datasets de ejemplo.' });
  };

  const storageRatio = summary.totalBytes / STORAGE_LIMIT_BYTES;
  const versionsRatio = summary.totalVersions / VERSION_LIMIT;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="dataset" size={14} strokeWidth={2} />
            M05 · Datasets
          </p>
          <h1 className="page-head__title">Gobierno de datasets y versiones</h1>
          <p className="page-head__lede">
            Registro de metadatos, carga controlada y particiones de entrenamiento, validación y prueba.
            Los archivos permanecen en almacenamiento de objetos y nunca se ejecutan en el navegador ni
            en la API.
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={handleReset}>
            <Icon name="refresh" size={16} />
            Restaurar demo
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setDialog({ kind: 'create' })}>
            <Icon name="plus" size={16} />
            Registrar dataset
          </button>
        </div>
      </div>

      {notice ? (
        <div className="ds-notice" data-tone={notice.tone} role="status">
          <Icon name={notice.tone === 'success' ? 'checkCircle' : 'info'} size={16} />
          <p>{notice.text}</p>
          <button
            type="button"
            className="ds-notice__close"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}

      <div className="dash">
        <section className="kpi-grid" aria-label="Indicadores del catálogo de datasets">
          <article className="kpi" data-accent="indigo">
            <div className="kpi__top">
              <h3 className="kpi__label">Datasets registrados</h3>
              <span className="kpi__icon">
                <Icon name="dataset" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{datasets.length}</p>
            </div>
            <div className="kpi__foot">
              <span>{summary.projects} proyectos con datos</span>
              <span>{summary.usable} listos</span>
            </div>
          </article>

          <article className="kpi" data-accent="emerald">
            <div className="kpi__top">
              <h3 className="kpi__label">Volumen gobernado</h3>
              <span className="kpi__icon">
                <Icon name="storage" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{formatBytes(summary.totalBytes)}</p>
            </div>
            <div className="kpi__foot">
              <span>Cuota de {formatBytes(STORAGE_LIMIT_BYTES)}</span>
              <span>{Math.round(storageRatio * 100)}&nbsp;% usado</span>
            </div>
          </article>

          <article className="kpi" data-accent="violet">
            <div className="kpi__top">
              <h3 className="kpi__label">Versiones trazadas</h3>
              <span className="kpi__icon">
                <Icon name="layers" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{summary.totalVersions}</p>
            </div>
            <div className="kpi__foot">
              <span>Inmutables por diseño</span>
              <span>checksum SHA-256</span>
            </div>
          </article>

          <article className="kpi" data-accent="amber">
            <div className="kpi__top">
              <h3 className="kpi__label">Pendientes de validación</h3>
              <span className="kpi__icon">
                <Icon name="alertTriangle" size={17} />
              </span>
            </div>
            <div className="kpi__value-row">
              <p className="kpi__value">{summary.pending}</p>
            </div>
            <div className="kpi__foot">
              <span>{counts.VALIDATING} en validación</span>
              <span>{summary.quarantined} retenidos</span>
            </div>
          </article>
        </section>

        <div className="ds-grid">
          <div className="ds-col">
            <DatasetCatalog
              datasets={filtered}
              total={datasets.length}
              selectedId={selectedId}
              filter={filter}
              counts={counts}
              term={term}
              onSelect={setSelectedId}
              onFilter={setFilter}
              onTerm={setTerm}
            />

            <Panel
              title="Política de ingesta"
              subtitle="Controles aplicados antes de publicar una versión."
              icon="shield"
            >
              <ul className="ds-policy">
                <li>
                  <Icon name="checkCircle" size={14} />
                  Formato y extensión verificados por tipo de archivo.
                </li>
                <li>
                  <Icon name="checkCircle" size={14} />
                  Tamaño máximo: CSV 2&nbsp;GB · JSON 512&nbsp;MB · NPZ 4&nbsp;GB · ZIP 5&nbsp;GB.
                </li>
                <li>
                  <Icon name="checkCircle" size={14} />
                  Contenido inspeccionado: se rechazan ejecutables y rutas sospechosas.
                </li>
                <li>
                  <Icon name="checkCircle" size={14} />
                  Particiones de entrenamiento, validación y prueba declaradas antes de publicar.
                </li>
                <li>
                  <Icon name="checkCircle" size={14} />
                  Eliminación con confirmación por nombre y purga diferida de 30 días.
                </li>
              </ul>
              <p className="panel__note">
                Los archivos se validan por tipo, tamaño, permisos y contenido; nunca se ejecutan
                (RN-06). La base de datos conserva solo metadatos, checksums y trazabilidad.
              </p>
            </Panel>
          </div>

          <div className="ds-col">
            <DatasetDetail
              dataset={selected}
              onNewVersion={(dataset) => setDialog({ kind: 'version', dataset })}
              onDelete={(dataset) => setDialog({ kind: 'delete', dataset })}
            />

            <Panel
              title="Almacenamiento y retención"
              subtitle="Cuota de objetos del catálogo."
              icon="storage"
            >
              <div className="meter-grid">
                <Meter
                  label="Objetos del catálogo"
                  detail={`${formatBytes(summary.totalBytes)} de ${formatBytes(STORAGE_LIMIT_BYTES)}`}
                  ratio={storageRatio}
                  tone={toneForUsage(storageRatio)}
                />
                <Meter
                  label="Versiones conservadas"
                  detail={`${summary.totalVersions} de ${VERSION_LIMIT}`}
                  ratio={versionsRatio}
                  tone={toneForUsage(versionsRatio)}
                />
              </div>
              <p className="panel__note">
                La purga elimina el objeto del almacenamiento y mantiene el evento de auditoría. Los
                datasets retenidos ({counts.QUARANTINED}) no pueden usarse en entrenamientos.
              </p>
            </Panel>
          </div>
        </div>
      </div>

      {dialog?.kind === 'create' ? (
        <DatasetFormDialog
          mode="create"
          projects={datasetProjects}
          onClose={() => setDialog(null)}
          onSubmit={handleCreate}
        />
      ) : null}

      {dialog?.kind === 'version' ? (
        <DatasetFormDialog
          mode="version"
          dataset={dialog.dataset}
          projects={datasetProjects}
          onClose={() => setDialog(null)}
          onSubmit={(payload) => handleVersion(dialog.dataset, payload)}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteDatasetDialog
          dataset={dialog.dataset}
          onClose={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.dataset)}
        />
      ) : null}
    </>
  );
}
