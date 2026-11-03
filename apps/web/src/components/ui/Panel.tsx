import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

export interface PanelProps {
  title: string;
  subtitle?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** `tight` elimina el padding interior para tablas y listas. */
  body?: 'default' | 'tight';
  className?: string;
  headingLevel?: 2 | 3;
  /** Permite enlazar secciones por ancla desde el índice del módulo. */
  id?: string;
}

export function Panel({
  title,
  subtitle,
  icon,
  actions,
  footer,
  children,
  body = 'default',
  className,
  headingLevel = 2,
  id,
}: PanelProps) {
  const headingId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <section
      id={id}
      className={className ? `panel ${className}` : 'panel'}
      aria-labelledby={headingId}
    >
      <header className="panel__head">
        <div className="panel__titles">
          <Heading id={headingId} className="panel__title">
            {icon ? (
              <span className="u-row" style={{ gap: 'var(--sp-2)' }}>
                <Icon name={icon} size={17} strokeWidth={1.8} style={{ color: 'var(--brand)' }} />
                {title}
              </span>
            ) : (
              title
            )}
          </Heading>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>

      <div className={body === 'tight' ? 'panel__body panel__body--tight' : 'panel__body'}>
        {children}
      </div>

      {footer ? <div className="panel__foot">{footer}</div> : null}
    </section>
  );
}
