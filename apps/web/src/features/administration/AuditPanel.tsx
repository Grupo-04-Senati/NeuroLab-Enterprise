import { useMemo, useState } from 'react';
import type { AuditCategory, AuditEvent, AuditSeverity } from '@/types/administration';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  auditCategories,
  auditCategoryMeta,
  auditSeverities,
  auditSeverityMeta,
  filterAudit,
} from '@/features/administration/model';

interface AuditPanelProps {
  events: AuditEvent[];
  retentionDays: number;
  onExport: (events: AuditEvent[]) => void;
}

const metadataLabels: Record<string, string> = {
  metodo: 'Método',
  mfa: 'MFA',
  sesion: 'Sesión',
  epocas: 'Épocas',
  lote: 'Lote',
  optimizador: 'Optimizador',
  gpu: 'GPU',
  formato: 'Formato',
  filas: 'Filas',
  revision: 'Revisión',
  rolAnterior: 'Rol anterior',
  rolNuevo: 'Rol nuevo',
  origen: 'Origen',
  checksum: 'Checksum',
  revisor: 'Revisor',
  estado: 'Estado',
  intentos: 'Intentos',
  ventana: 'Ventana',
  accion: 'Acción',
  registros: 'Registros',
  particiones: 'Particiones',
  controles: 'Controles',
  anterior: 'Anterior',
  nuevo: 'Nuevo',
  motivo: 'Motivo',
  auditoriaDias: 'Auditoría (días)',
  artefactosDias: 'Artefactos (días)',
  metricasDias: 'Métricas (días)',
  confirmada: 'Confirmada',
  sesionesCerradas: 'Sesiones cerradas',
  politica: 'Política',
  recurso: 'Recurso',
  eventos: 'Eventos',
  rango: 'Rango',
  advertencias: 'Advertencias',
  decision: 'Decisión',
  sucesora: 'Sucesora',
  unidad: 'Unidad',
};

function formatMetadataValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

export function AuditPanel({ events, retentionDays, onExport }: AuditPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AuditCategory | 'ALL'>('ALL');
  const [severity, setSeverity] = useState<AuditSeverity | 'ALL'>('ALL');

  const visible = useMemo(
    () => filterAudit(events, { query, category, severity }),
    [events, query, category, severity],
  );

  const critical = events.filter((event) => event.severity === 'critical').length;
  const warnings = events.filter((event) => event.severity === 'warning').length;

  return (
    <div className="adm-embedded">
      <div className="adm-embedded__head">
        <Chip tone={critical > 0 ? 'failed' : 'completed'} dot>
          {critical} críticos · {warnings} advertencias
        </Chip>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onExport(visible)}
          disabled={visible.length === 0}
        >
          <Icon name="download" size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="adm-audit-toolbar">
        <label className="adm-search">
          <Icon name="search" size={15} />
          <input
            type="search"
            value={query}
            placeholder="Buscar por acción, actor, objetivo o IP"
            aria-label="Buscar eventos de auditoría"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <Icon name="close" size={13} />
            </button>
          ) : null}
        </label>

        <label className="adm-select-wrap">
          <span className="u-sr-only">Categoría</span>
          <select
            className="adm-select"
            value={category}
            onChange={(event) => setCategory(event.target.value as AuditCategory | 'ALL')}
          >
            <option value="ALL">Todas las categorías</option>
            {auditCategories.map((item) => (
              <option key={item} value={item}>
                {auditCategoryMeta[item].label}
              </option>
            ))}
          </select>
        </label>

        <div className="filters" role="group" aria-label="Filtrar por severidad">
          <button
            type="button"
            className="filter-btn"
            aria-pressed={severity === 'ALL'}
            onClick={() => setSeverity('ALL')}
          >
            Todas
          </button>
          {auditSeverities.map((option) => (
            <button
              key={option}
              type="button"
              className="filter-btn"
              aria-pressed={severity === option}
              onClick={() => setSeverity(option)}
            >
              {auditSeverityMeta[option].label}
            </button>
          ))}
        </div>
      </div>

      <p className="adm-audit-count" role="status">
        {visible.length} de {events.length} eventos · retención {retentionDays} días
      </p>

      {visible.length === 0 ? (
        <div className="empty">
          <Icon name="fileText" size={32} />
          <h3>Sin eventos que coincidan</h3>
          <p>Pruebe otra categoría, severidad o término de búsqueda.</p>
        </div>
      ) : (
        <ol className="adm-audit" aria-label="Eventos de auditoría">
          {visible.map((event) => {
            const meta = auditCategoryMeta[event.category];
            const severityMeta = auditSeverityMeta[event.severity];
            return (
              <li key={event.id} className="adm-event" data-severity={event.severity}>
                <details>
                  <summary className="adm-event__summary">
                    <span className="adm-event__icon" aria-hidden="true">
                      <Icon name={meta.icon} size={16} />
                    </span>
                    <span className="adm-event__main">
                      <span className="adm-event__title">{event.label}</span>
                      <span className="adm-event__meta">
                        <code>{event.action}</code>
                        <span>{meta.label}</span>
                        <span>{event.actorName}</span>
                      </span>
                    </span>
                    <span className="adm-event__target" title={event.target}>
                      {event.projectName ? (
                        <span className="adm-event__project">
                          <Icon name="projects" size={12} />
                          {event.projectName}
                        </span>
                      ) : null}
                      <span>{event.target}</span>
                    </span>
                    <span className="adm-event__side">
                      <Chip tone={severityMeta.tone} dot>
                        {severityMeta.label}
                      </Chip>
                      <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                        {formatRelativeTime(event.createdAt)}
                      </time>
                    </span>
                    <span className="adm-event__chevron" aria-hidden="true">
                      <Icon name="chevronDown" size={14} />
                    </span>
                  </summary>

                  <div className="adm-event__detail">
                    <dl>
                      <div>
                        <dt>Evento</dt>
                        <dd className="u-mono">{event.id}</dd>
                      </div>
                      <div>
                        <dt>Fecha</dt>
                        <dd>{formatDateTime(event.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Actor</dt>
                        <dd>
                          {event.actorName} · {event.actorRole}
                        </dd>
                      </div>
                      <div>
                        <dt>IP de origen</dt>
                        <dd className="u-mono">{event.ip}</dd>
                      </div>
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt>{metadataLabels[key] ?? key}</dt>
                          <dd>{formatMetadataValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p>
                      Registro inmutable. Los metadatos excluyen contraseñas, tokens y contenido de
                      datasets (§11).
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      <p className="panel__note adm-audit-note">
        Consumido desde <code>GET /api/v1/projects/&#123;id&#125;/audit-events</code> y del registro
        global de gobierno. La exportación se limita al filtro vigente y también deja constancia.
      </p>
    </div>
  );
}
