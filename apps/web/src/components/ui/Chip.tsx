import type { ReactNode } from 'react';
import type { JobStatus } from '@/types/domain';
import { statusMeta } from '@/lib/nav';

export interface ChipProps {
  tone?: 'neutral' | 'preparing' | 'running' | 'completed' | 'failed' | 'cancelled' | 'outline';
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  title?: string;
}

export function Chip({ tone = 'neutral', dot = false, pulse = false, children, title }: ChipProps) {
  const classes = ['chip', `chip--${tone}`];
  if (pulse) classes.push('chip--pulse');

  return (
    <span className={classes.join(' ')} title={title}>
      {dot ? <span className="chip__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Estado de la máquina de estados RN-02; el color nunca es la única señal. */
export function StatusChip({ status, pulse }: { status: JobStatus; pulse?: boolean }) {
  const meta = statusMeta[status];
  return (
    <Chip tone={meta.tone} dot pulse={pulse ?? status === 'RUNNING'}>
      {meta.label}
    </Chip>
  );
}
