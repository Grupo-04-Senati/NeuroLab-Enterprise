import type { DatasetRecord } from '@/types/dataset';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  auditDataset,
  datasetAccessMeta,
  datasetFileName,
  datasetPrivacyMeta,
  formatBytes,
  formatChecksum,
  formatRows,
} from '@/features/datasets/model';
import { DatasetStatusChip } from '@/features/datasets/DatasetStatusChip';
import { SplitBar } from '@/features/datasets/SplitBar';

interface DatasetDetailProps {
  dataset: DatasetRecord | null;
  onNewVersion: (dataset: DatasetRecord) => void;
  onDelete: (dataset: DatasetRecord) => void;
}

export function DatasetDetail({ dataset, onNewVersion, onDelete }: DatasetDetailProps) {
  if (!dataset) {
    return (
      <Panel title="Ficha del dataset" icon="dataset" subtitle="Selecciona un registro del catálogo.">
        <div className="empty">
          <Icon name="dataset" />
          <h3>Ningún dataset seleccionado</h3>
          <p>Elige una fila del catálogo para revisar sus particiones, versiones y controles de validación.</p>
        </div>
      </Panel>
    );
  }

  const privacy = datasetPrivacyMeta[dataset.privacy];
  const access = datasetAccessMeta[dataset.access];
  const checks = auditDataset(dataset);
  const failed = checks.filter((check) => !check.ok).length;

  return (
    <Panel
      title="Ficha del dataset"
      subtitle={`${dataset.id} · ${dataset.owner}`}
      icon="dataset"
      actions={<DatasetStatusChip status={dataset.status} />}
      footer={
        <>
          <span className="ds-foot-actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => onNewVersion(dataset)}
            >
              <Icon name="upload" size={14} />
              Nueva versión
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm ds-danger"
              onClick={() => onDelete(dataset)}
            >
              <Icon name="alertTriangle" size={14} />
              Eliminar
            </button>
          </span>
          <span className="ds-foot-note">v{dataset.currentVersion} vigente</span>
        </>
      }
    >
      <div className="ds-detail-head">
        <span className="ds-vtag u-mono">v{dataset.currentVersion}</span>
        <Chip tone={privacy.tone} title={privacy.hint}>
          {privacy.label}
        </Chip>
        {failed > 0 ? (
          <Chip tone="failed" title="Hay controles de validación pendientes">
            {failed} {failed === 1 ? 'control pendiente' : 'controles pendientes'}
          </Chip>
        ) : (
          <Chip tone="completed">Controles superados</Chip>
        )}
      </div>

      <p className="ds-detail-desc">{dataset.description}</p>

      <ul className="ds-tags" aria-label="Etiquetas">
        {dataset.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>

      <dl className="ds-facts">
        <div className="ds-fact">
          <dt>Proyecto</dt>
          <dd>{dataset.project}</dd>
        </div>
        <div className="ds-fact">
          <dt>Formato</dt>
          <dd className="u-mono">{dataset.format}</dd>
        </div>
        <div className="ds-fact">
          <dt>Filas</dt>
          <dd className="u-mono">{formatRows(dataset.rows)}</dd>
        </div>
        <div className="ds-fact">
          <dt>Tamaño</dt>
          <dd className="u-mono">{formatBytes(dataset.sizeBytes)}</dd>
        </div>
        <div className="ds-fact">
          <dt>Licencia</dt>
          <dd>{dataset.license}</dd>
        </div>
        <div className="ds-fact">
          <dt>Actualizado</dt>
          <dd title={formatDateTime(dataset.updatedAt)}>{formatRelativeTime(dataset.updatedAt)}</dd>
        </div>
      </dl>

      <section className="ds-block" aria-labelledby="ds-split-title">
        <div className="ds-block__head">
          <h3 id="ds-split-title">Particiones</h3>
          <span className="u-caps">100&nbsp;% declarado</span>
        </div>
        <SplitBar split={dataset.split} size="lg" />
        <div className="ds-split__legend">
          <span>
            <i className="ds-split__dot" data-part="train" />
            Entrenamiento <strong>{dataset.split.train}&nbsp;%</strong>
          </span>
          <span>
            <i className="ds-split__dot" data-part="validation" />
            Validación <strong>{dataset.split.validation}&nbsp;%</strong>
          </span>
          <span>
            <i className="ds-split__dot" data-part="test" />
            Prueba <strong>{dataset.split.test}&nbsp;%</strong>
          </span>
        </div>
      </section>

      <section className="ds-block" aria-labelledby="ds-checks-title">
        <div className="ds-block__head">
          <h3 id="ds-checks-title">Controles de validación</h3>
        </div>
        <ul className="ds-checks">
          {checks.map((check) => (
            <li key={check.id} className="ds-check" data-ok={check.ok}>
              <Icon name={check.ok ? 'checkCircle' : 'alertTriangle'} size={14} strokeWidth={2} />
              <span>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ds-block" aria-labelledby="ds-versions-title">
        <div className="ds-block__head">
          <h3 id="ds-versions-title">Versiones</h3>
          <span className="u-caps">{dataset.versions.length} en historial</span>
        </div>
        <ul className="ds-versions">
          {dataset.versions.map((version) => (
            <li key={version.version} className="ds-version">
              <span className="ds-version__tag u-mono">v{version.version}</span>
              <span className="ds-version__text">
                <strong>{version.note}</strong>
                <span>
                  {formatDateTime(version.createdAt)} · {formatRows(version.rows)} filas ·{' '}
                  {formatBytes(version.sizeBytes)}
                </span>
                <span className="u-mono" title={version.checksum}>
                  SHA-256 {formatChecksum(version.checksum)}
                </span>
              </span>
              {version.version === dataset.currentVersion ? <Chip tone="outline">Vigente</Chip> : null}
            </li>
          ))}
        </ul>
        <p className="ds-note">
          Las versiones publicadas no se sobrescriben: cada carga crea una versión nueva y conserva la
          trazabilidad de archivo, autor y checksum.
        </p>
      </section>

      <section className="ds-access" aria-label="Permisos de acceso">
        <Icon name="shield" size={15} />
        <span>
          <strong>{access.label}</strong> · {access.hint}
        </span>
      </section>

      <p className="ds-note ds-note--mono">
        Archivo vigente: <span className="u-mono">{datasetFileName(dataset)}</span>
      </p>
    </Panel>
  );
}
