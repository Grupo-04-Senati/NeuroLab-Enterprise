import type { ReportBlock, ReportDocument, ReportSection } from '@/features/reports/model';
import { MASKED } from '@/features/reports/model';
import { Icon } from '@/components/ui/Icon';
import { LossGainChart } from '@/components/ui/DataViz';
import { formatDateTime, formatNumber, formatDuration, formatRate } from '@/lib/format';

/* §6 M09 · el documento es el mismo objeto que se exporta. Lo que la pantalla muestra es la
   estructura que viaja al CSV y al PDF, así que no existen dos versiones del informe. */

const TONE_ICON = { info: 'info', warning: 'alertTriangle', danger: 'alertCircle' } as const;

export function ReportSheet({ document }: { document: ReportDocument }) {
  const { totals } = document;
  return (
    <article className="rp-doc" aria-label={`Informe de ${document.project.name}`}>
      <header className="rp-doc__head">
        <div>
          <p className="rp-doc__eyebrow">
            <Icon name="report" size={13} />
            NeuroLab Enterprise · Informe de proyecto
          </p>
          <h2 className="rp-doc__title">{document.project.name}</h2>
          <p className="rp-doc__sub">
            <span className="u-mono">{document.project.id}</span> · {document.scopeLabel}
          </p>
        </div>
        <dl className="rp-doc__stamp">
          <div>
            <dt>Emitido</dt>
            <dd>{formatDateTime(document.generatedAt)}</dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>
              {document.actor.name} · {document.actor.projectRoleLabel}
            </dd>
          </div>
          <div>
            <dt>Origen</dt>
            <dd>{document.dataSource === 'demo' ? 'Demostración local' : 'API de la plataforma'}</dd>
          </div>
        </dl>
      </header>

      <div className="rp-doc__totals">
        <Metric label="Ejecuciones" value={formatNumber(totals.runs)} />
        <Metric label="Completadas" value={formatNumber(totals.completed)} tone="ok" />
        <Metric label="Fallidas" value={formatNumber(totals.failed)} tone={totals.failed > 0 ? 'bad' : undefined} />
        <Metric label="Canceladas" value={formatNumber(totals.cancelled)} tone={totals.cancelled > 0 ? 'warn' : undefined} />
        <Metric
          label="Mejor val_acc"
          value={totals.bestAccuracy === null ? '—' : formatRate(totals.bestAccuracy, 1)}
        />
        <Metric label="Cómputo" value={formatDuration(totals.gpuSeconds)} />
        <Metric label="Avisos" value={formatNumber(totals.warnings)} tone={totals.warnings > 0 ? 'warn' : 'ok'} />
      </div>

      {document.masked.length > 0 ? (
        <p className="rp-doc__masked" role="note">
          <Icon name="lock" size={13} />
          <strong>{document.masked.length}</strong> campo(s) se publicaron como «{MASKED}» según su rol:{' '}
          {document.masked.join(', ')}.
        </p>
      ) : null}

      {document.sections.map((section) => (
        <ReportSectionView key={section.id} section={section} />
      ))}

      <footer className="rp-doc__foot">
        <span>
          Documento generado en la consola. La validación se lee de la plataforma; el navegador no
          recalcula la red (RN-03).
        </span>
        <span className="u-mono">
          {document.sections.length} sección(es) · {formatNumber(document.sections.reduce((sum, item) => sum + item.rows, 0))} filas
        </span>
      </footer>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="rp-metric" data-tone={tone}>
      <span className="rp-metric__label u-caps">{label}</span>
      <span className="rp-metric__value u-num">{value}</span>
    </div>
  );
}

function ReportSectionView({ section }: { section: ReportSection }) {
  return (
    <section className="rp-section" id={`rp-${section.id}`}>
      <header className="rp-section__head">
        <h3 className="rp-section__title">{section.label}</h3>
        <span className="rp-section__module u-caps">{section.module}</span>
      </header>
      {section.blocks.map((block, index) => (
        <BlockView key={`${section.id}-${index}`} block={block} />
      ))}
    </section>
  );
}

function BlockView({ block }: { block: ReportBlock }) {
  if (block.kind === 'fields') {
    return (
      <div className="rp-block">
        <h4 className="rp-block__title">{block.title}</h4>
        <dl className="rp-fields">
          {block.fields.map((field) => (
            <div className="rp-fields__item" key={field.label}>
              <dt>{field.label}</dt>
              <dd data-masked={field.value === MASKED || undefined} className={field.mono ? 'u-mono' : undefined}>
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (block.kind === 'table') {
    return (
      <div className="rp-block">
        <h4 className="rp-block__title">{block.title}</h4>
        {block.rows.length === 0 ? (
          <p className="rp-block__empty">Sin registros en este alcance.</p>
        ) : (
          <div className="table-wrap">
            <table className="table rp-table">
              <caption className="u-sr-only">{block.title}</caption>
              <thead>
                <tr>
                  {block.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, index) => (
                  <tr key={`${block.title}-${index}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${block.columns[cellIndex]}-${cellIndex}`}
                        data-label={block.columns[cellIndex]}
                        data-masked={cell === MASKED || undefined}
                        data-col={cellIndex === 0 ? 'name' : undefined}
                      >
                        {cellIndex === 0 ? <span className="table__name">{cell}</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (block.kind === 'list') {
    return (
      <div className="rp-block">
        <h4 className="rp-block__title">{block.title}</h4>
        <ul className="rp-list">
          {block.items.map((item, index) => (
            <li key={`${item}-${index}`} data-severity={item.startsWith('error') ? 'error' : undefined}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.kind === 'chart') {
    return (
      <figure className="rp-block">
        <h4 className="rp-block__title">{block.title}</h4>
        <LossGainChart points={block.points} model={block.model} height={210} />
        <figcaption className="rp-block__empty">
          Series época a época leídas del trabajo {block.model}; la consola no recalcula métricas (RN-03).
        </figcaption>
      </figure>
    );
  }

  return (
    <p className="rp-note" data-tone={block.tone}>
      <Icon name={TONE_ICON[block.tone]} size={16} />
      <span>
        <strong>{block.title}.</strong> {block.text}
      </span>
    </p>
  );
}
