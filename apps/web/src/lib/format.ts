const LOCALE = 'es-ES';

const numberCache = new Map<string, Intl.NumberFormat>();

function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = numberCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options);
    numberCache.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(value: number, decimals = 0): string {
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatCompact(value: number): string {
  return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Precisión y recall llegan como razón 0–1. */
export function formatRate(value: number, decimals = 1): string {
  return `${formatNumber(value * 100, decimals)}\u00a0%`;
}

/** Pérdida: conviene alta resolución para distinguir épocas contiguas. */
export function formatLoss(value: number): string {
  return value >= 0.001 || value === 0 ? formatNumber(value, 3) : value.toExponential(1);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}\u00a0s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}\u00a0min\u00a0${String(seconds % 60).padStart(2, '0')}\u00a0s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}\u00a0min`;
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}\u00a0h` : `${minutes}m\u00a0${String(safe % 60).padStart(2, '0')}s`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const deltaSeconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  if (abs < 45) return 'ahora mismo';
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86_400],
    ['month', 2_592_000],
  ];
  let chosen: Intl.RelativeTimeFormatUnit = 'minute';
  let magnitude = Math.round(deltaSeconds / 60);
  for (let i = 0; i < units.length; i += 1) {
    const [unit, secondsPerUnit] = units[i];
    const next = units[i + 1];
    magnitude = Math.round(deltaSeconds / secondsPerUnit);
    chosen = unit;
    if (!next || abs < next[1]) break;
  }
  return new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' }).format(magnitude, chosen);
}

export function percentage(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function toneForUsage(ratio: number): 'ok' | 'warning' | 'danger' {
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.75) return 'warning';
  return 'ok';
}
