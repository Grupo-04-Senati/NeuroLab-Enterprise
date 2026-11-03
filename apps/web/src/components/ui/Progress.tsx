import type { JobStatus } from '@/types/domain';

const TONE_COLOR: Record<string, string> = {
  ok: 'var(--brand)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export interface ProgressBarProps {
  /** Porcentaje 0–100. */
  value: number;
  status: JobStatus;
  label: string;
  aside?: string;
  striped?: boolean;
}

export function ProgressBar({ value, status, label, aside, striped }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, value));
  const tone = status.toLowerCase();
  const classes = ['progress__bar'];
  if (striped && status === 'RUNNING') classes.push('progress__bar--striped');

  return (
    <div className="progress">
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={classes.join(' ')} data-status={tone} style={{ width: `${safe}%` }} />
      </div>
      <div className="progress__meta">
        <span>{label}</span>
        {aside ? <strong>{aside}</strong> : null}
      </div>
    </div>
  );
}

export interface MeterProps {
  label: string;
  detail: string;
  /** Razón 0–1 de consumo sobre el límite. */
  ratio: number;
  tone: 'ok' | 'warning' | 'danger';
}

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function Meter({ label, detail, ratio, tone }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const shown = Math.round(clamped * 100);

  return (
    <div className="meter" data-tone={tone}>
      <div className="meter__ring">
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r={RING_RADIUS} fill="none" stroke="var(--surface-sunken)" strokeWidth="5" />
          <circle
            cx="23"
            cy="23"
            r={RING_RADIUS}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${clamped * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          />
        </svg>
        <span className="meter__ring-value">{shown}%</span>
      </div>
      <div className="meter__text">
        <span className="meter__label">{label}</span>
        <span className="meter__detail">{detail}</span>
      </div>
    </div>
  );
}
