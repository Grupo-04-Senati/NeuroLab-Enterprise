import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { MfaPolicy, SecuritySettings } from '@/types/administration';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import {
  mfaPolicyLabels,
  validateSettings,
  type SettingsErrors,
} from '@/features/administration/model';

interface PolicyPanelProps {
  settings: SecuritySettings;
  onSave: (settings: SecuritySettings) => void;
}

const mfaOptions: MfaPolicy[] = ['ADMINS', 'ALL', 'OPTIONAL'];

function sameSettings(a: SecuritySettings, b: SecuritySettings): boolean {
  return (
    a.sessionMinutes === b.sessionMinutes &&
    a.mfaPolicy === b.mfaPolicy &&
    a.auditRetentionDays === b.auditRetentionDays &&
    a.artifactRetentionDays === b.artifactRetentionDays &&
    a.metricsRetentionDays === b.metricsRetentionDays &&
    a.exportRequiresReview === b.exportRequiresReview
  );
}

export function PolicyPanel({ settings, onSave }: PolicyPanelProps) {
  const [draft, setDraft] = useState<SecuritySettings>(settings);
  const [errors, setErrors] = useState<SettingsErrors>({});

  useEffect(() => {
    setDraft(settings);
    setErrors({});
  }, [settings]);

  const dirty = !sameSettings(draft, settings);

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateSettings(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave(draft);
  };

  const discard = () => {
    setDraft(settings);
    setErrors({});
  };

  return (
    <div className="adm-embedded">
      <form id="adm-policy-form" className="adm-policy" onSubmit={handleSubmit} noValidate>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="adm-session">Duración de sesión (min)</label>
            <input
              id="adm-session"
              className="adm-input"
              type="number"
              min={5}
              max={120}
              step={5}
              value={draft.sessionMinutes}
              aria-invalid={Boolean(errors.sessionMinutes)}
              onChange={(event) => update('sessionMinutes', Number(event.target.value))}
            />
            {errors.sessionMinutes ? (
              <span className="adm-field__error">{errors.sessionMinutes}</span>
            ) : (
              <span className="adm-field__hint">Cierre por inactividad entre 5 y 120 min.</span>
            )}
          </div>

          <div className="adm-field">
            <label htmlFor="adm-mfa">Autenticación multifactor</label>
            <select
              id="adm-mfa"
              className="adm-input"
              value={draft.mfaPolicy}
              onChange={(event) => update('mfaPolicy', event.target.value as MfaPolicy)}
            >
              {mfaOptions.map((option) => (
                <option key={option} value={option}>
                  {mfaPolicyLabels[option]}
                </option>
              ))}
            </select>
            <span className="adm-field__hint">
              {draft.mfaPolicy === 'OPTIONAL'
                ? 'Reduce la protección de cuentas con privilegios.'
                : 'Se exige un segundo factor TOTP al iniciar sesión.'}
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="adm-audit-retention">Retención de auditoría (días)</label>
            <input
              id="adm-audit-retention"
              className="adm-input"
              type="number"
              min={30}
              max={730}
              step={5}
              value={draft.auditRetentionDays}
              aria-invalid={Boolean(errors.auditRetentionDays)}
              onChange={(event) => update('auditRetentionDays', Number(event.target.value))}
            />
            {errors.auditRetentionDays ? (
              <span className="adm-field__error">{errors.auditRetentionDays}</span>
            ) : (
              <span className="adm-field__hint">Entre 30 y 730 días.</span>
            )}
          </div>

          <div className="adm-field">
            <label htmlFor="adm-artifact-retention">Retención de artefactos (días)</label>
            <input
              id="adm-artifact-retention"
              className="adm-input"
              type="number"
              min={7}
              max={365}
              step={1}
              value={draft.artifactRetentionDays}
              aria-invalid={Boolean(errors.artifactRetentionDays)}
              onChange={(event) => update('artifactRetentionDays', Number(event.target.value))}
            />
            {errors.artifactRetentionDays ? (
              <span className="adm-field__error">{errors.artifactRetentionDays}</span>
            ) : (
              <span className="adm-field__hint">Checkpoints y modelos retirados.</span>
            )}
          </div>

          <div className="adm-field">
            <label htmlFor="adm-metrics-retention">Retención de métricas (días)</label>
            <input
              id="adm-metrics-retention"
              className="adm-input"
              type="number"
              min={30}
              max={365}
              step={5}
              value={draft.metricsRetentionDays}
              aria-invalid={Boolean(errors.metricsRetentionDays)}
              onChange={(event) => update('metricsRetentionDays', Number(event.target.value))}
            />
            {errors.metricsRetentionDays ? (
              <span className="adm-field__error">{errors.metricsRetentionDays}</span>
            ) : (
              <span className="adm-field__hint">Series de época y evaluación.</span>
            )}
          </div>
        </div>

        <label className="adm-switch">
          <input
            type="checkbox"
            checked={draft.exportRequiresReview}
            onChange={(event) => update('exportRequiresReview', event.target.checked)}
          />
          <span className="adm-switch__track" aria-hidden="true">
            <span />
          </span>
          <span className="adm-switch__text">
            <strong>Revisión previa a la exportación</strong>
            <span>
              Exige la aprobación de un revisor antes de descargar reportes con datos de clientes.
            </span>
          </span>
        </label>
      </form>

      <p className="panel__note adm-policy-note">
        La retención de auditoría ({formatNumber(draft.auditRetentionDays)} días) no puede ser menor a
        30 días para sostener la trazabilidad exigida en el §11. Los registros vencidos se purgan sin
        afectar a los proyectos.
      </p>

      <div className="adm-policy__actions adm-embedded__actions">
        <span className="adm-policy__dirty" data-dirty={dirty}>
          {dirty ? (
            <>
              <Icon name="info" size={13} />
              Cambios sin guardar
            </>
          ) : (
            <>
              <Icon name="checkCircle" size={13} />
              Políticas sincronizadas
            </>
          )}
        </span>
        <button type="button" className="btn btn--secondary btn--sm" disabled={!dirty} onClick={discard}>
          Descartar
        </button>
        <button
          type="submit"
          form="adm-policy-form"
          className="btn btn--primary btn--sm"
          disabled={!dirty}
        >
          <Icon name="shield" size={14} />
          Guardar políticas
        </button>
      </div>
    </div>
  );
}
