import { useState } from 'react';
import type { ResourceLimit, ResourceLimitId } from '@/types/administration';
import { formatNumber, percentage } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { limitTone, validateLimit } from '@/features/administration/model';

interface LimitsPanelProps {
  limits: ResourceLimit[];
  onApply: (id: ResourceLimitId, value: number) => void;
}

const toneLabel: Record<'ok' | 'warning' | 'danger', string> = {
  ok: 'Holgado',
  warning: 'Cerca del límite',
  danger: 'Saturado',
};

export function LimitsPanel({ limits, onApply }: LimitsPanelProps) {
  const [drafts, setDrafts] = useState<Partial<Record<ResourceLimitId, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<ResourceLimitId, string>>>({});

  const inputValue = (limit: ResourceLimit): string =>
    drafts[limit.id] ?? String(limit.limit);

  const handleApply = (limit: ResourceLimit) => {
    const raw = drafts[limit.id] ?? String(limit.limit);
    const value = Number(raw);
    const error = raw.trim() === '' ? 'Indique un valor numérico.' : validateLimit(limit, value);
    setErrors((previous) => ({ ...previous, [limit.id]: error ?? undefined }));
    if (error) return;
    onApply(limit.id, value);
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[limit.id];
      return next;
    });
  };

  return (
    <div className="adm-embedded">
      <div className="adm-embedded__head">
        <p className="adm-embedded__hint">
          Las cuotas se aplican al siguiente ciclo de planificación. Ningún límite puede quedar por
          debajo del consumo actual.
        </p>
        <Chip tone="outline">{limits.length} cuotas</Chip>
      </div>

      <div className="adm-limits">
        {limits.map((limit) => {
          const tone = limitTone(limit);
          const ratio = percentage(limit.used, limit.limit);
          const error = errors[limit.id];
          const draft = drafts[limit.id];
          const dirty = draft !== undefined && Number(draft) !== limit.limit;
          return (
            <article key={limit.id} className="adm-limit" data-tone={tone}>
              <div className="adm-limit__head">
                <span className="adm-limit__label">{limit.label}</span>
                <span className="adm-limit__value">
                  {formatNumber(limit.used)}
                  <small> / {formatNumber(limit.limit)}</small> {limit.unit}
                </span>
              </div>

              <div
                className="adm-limit__bar"
                role="progressbar"
                aria-valuenow={ratio}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${formatNumber(limit.used)} de ${formatNumber(limit.limit)} ${limit.unit}`}
                aria-label={`Consumo de ${limit.label}`}
              >
                <span style={{ width: `${ratio}%` }} />
              </div>

              <p className="adm-limit__hint">
                <span>{limit.hint}</span>
                <span className="adm-limit__state">{toneLabel[tone]}</span>
              </p>

              <div className="adm-limit__edit">
                <label className="adm-limit__field">
                  <span className="u-sr-only">Nuevo límite de {limit.label}</span>
                  <input
                    className="adm-input"
                    type="number"
                    min={limit.min}
                    max={limit.max}
                    step={limit.step}
                    value={inputValue(limit)}
                    aria-invalid={Boolean(error)}
                    onChange={(event) =>
                      setDrafts((previous) => ({ ...previous, [limit.id]: event.target.value }))
                    }
                  />
                  <span className="adm-limit__unit">{limit.unit}</span>
                </label>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={!dirty}
                  onClick={() => handleApply(limit)}
                >
                  <Icon name="checkCircle" size={14} />
                  Aplicar
                </button>
              </div>
              {error ? (
                <span className="adm-field__error" role="alert">
                  {error}
                </span>
              ) : (
                <span className="adm-limit__range">
                  Rango permitido: {formatNumber(limit.min)}–{formatNumber(limit.max)} {limit.unit}
                </span>
              )}
            </article>
          );
        })}
      </div>

      <p className="panel__note adm-limits-note">
        El programador rechaza trabajos que excedan la cuota y el exceso queda en la auditoría como
        evento de recursos.
      </p>
    </div>
  );
}
