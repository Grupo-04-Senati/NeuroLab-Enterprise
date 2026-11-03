import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { LayoutMode } from '@/hooks/useLayoutMode';
import { usePlatformData } from '@/app/providers';
import { demoActor } from '@/lib/session';
import { roleLabels } from '@/lib/nav';
import { formatRelativeTime } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

interface TopbarProps {
  mode: LayoutMode;
  onOpenNav: () => void;
}

function useDismissable<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return ref;
}

export function Topbar({ mode, onOpenNav }: TopbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { snapshot, refresh, lastUpdated } = usePlatformData();

  const [openPanel, setOpenPanel] = useState<'alerts' | 'profile' | null>(null);
  const [term, setTerm] = useState(searchParams.get('q') ?? '');

  const panelRef = useDismissable<HTMLDivElement>(() => setOpenPanel(null));

  useEffect(() => {
    setTerm(searchParams.get('q') ?? '');
  }, [searchParams]);

  const focusProject = snapshot?.topProjects[0];
  const alerts = snapshot?.alerts ?? [];
  const unread = alerts.filter((alert) => alert.severity !== 'info').length;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (term.trim()) next.set('q', term.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  return (
    <header className="topbar">
      {mode === 'drawer' ? (
        <button type="button" className="topbar__menu-btn" onClick={onOpenNav} aria-label="Abrir navegación">
          <Icon name="menu" size={19} />
        </button>
      ) : null}

      <Link to="/" className="topbar__brand">
        <img src="/logo-full.png" alt="NeuroLab Enterprise" />
      </Link>
      <span className="topbar__brand-rule" aria-hidden="true" />

      <div className="topbar__context">
        <Breadcrumbs />
        {focusProject ? (
          <Link to="/projects" className="project-tag" title="Contexto de proyecto">
            <Icon name="projects" size={14} />
            <span className="u-truncate">{focusProject.name}</span>
          </Link>
        ) : null}
      </div>

      <div className="topbar__tools">
        <form className="search" role="search" onSubmit={submitSearch}>
          <Icon name="search" size={16} />
          <label className="u-sr-only" htmlFor="global-search">
            Buscar en la plataforma
          </label>
          <input
            id="global-search"
            type="search"
            placeholder="Buscar proyecto, job o dataset"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </form>

        <button
          type="button"
          className="icon-btn"
          onClick={refresh}
          aria-label="Actualizar métricas del panel"
          title={`Última sincronización ${lastUpdated ? formatRelativeTime(lastUpdated) : 'pendiente'}`}
        >
          <Icon name="refresh" size={18} />
        </button>

        <div className="pop-anchor" ref={openPanel ? panelRef : undefined}>
          <button
            type="button"
            className="icon-btn"
            aria-haspopup="true"
            aria-expanded={openPanel === 'alerts'}
            aria-label={`Alertas de la plataforma (${unread} relevantes)`}
            onClick={() => setOpenPanel(openPanel === 'alerts' ? null : 'alerts')}
          >
            <Icon name="bell" size={18} />
            {unread > 0 ? <span className="icon-btn__dot">{unread}</span> : null}
          </button>

          {openPanel === 'alerts' ? (
            <div className="pop" role="dialog" aria-label="Alertas de la plataforma">
              <p className="pop__head">
                Alertas operativas
                <span className="u-caps">{alerts.length} activas</span>
              </p>
              <ul className="pop__list">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <Link to="/#alerts" className="pop__item" onClick={() => setOpenPanel(null)}>
                      <Icon
                        name={alert.severity === 'high' ? 'alertTriangle' : alert.severity === 'medium' ? 'alertCircle' : 'info'}
                        size={16}
                      />
                      <span>
                        <strong>{alert.title}</strong>
                        <em>{alert.module} · {formatRelativeTime(alert.createdAt)}</em>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <span className="topbar__divider u-hide-mobile" aria-hidden="true" />

        <div className="pop-anchor" ref={openPanel ? panelRef : undefined}>
          <button
            type="button"
            className="profile"
            aria-haspopup="true"
            aria-expanded={openPanel === 'profile'}
            aria-label={`Cuenta de ${demoActor.displayName}, rol ${roleLabels[demoActor.role]}`}
            onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')}
          >
            <span className="avatar" aria-hidden="true">
              {demoActor.initials}
            </span>
            <span className="profile__meta">
              <strong>{demoActor.displayName.split(' ')[0]} {demoActor.displayName.split(' ')[1]}</strong>
              <span>{roleLabels[demoActor.role]}</span>
            </span>
            <Icon name="chevronDown" size={15} />
          </button>

          {openPanel === 'profile' ? (
            <div className="pop pop--right" role="dialog" aria-label="Cuenta de usuario">
              <div className="pop__identity">
                <span className="avatar avatar--lg" aria-hidden="true">
                  {demoActor.initials}
                </span>
                <span>
                  <strong>{demoActor.displayName}</strong>
                  <em>{demoActor.email}</em>
                </span>
              </div>
              <ul className="pop__list">
                <li>
                  <Link to="/admin" className="pop__item" onClick={() => setOpenPanel(null)}>
                    <Icon name="settings" size={16} />
                    <span>
                      <strong>Preferencias y permisos</strong>
                      <em>Rol: {roleLabels[demoActor.role]}</em>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/projects" className="pop__item" onClick={() => setOpenPanel(null)}>
                    <Icon name="users" size={16} />
                    <span>
                      <strong>Mis proyectos</strong>
                      <em>{snapshot?.topProjects.length ?? 0} con acceso</em>
                    </span>
                  </Link>
                </li>
                <li>
                  <button type="button" className="pop__item pop__item--action" onClick={() => setOpenPanel(null)}>
                    <Icon name="logout" size={16} />
                    <span>
                      <strong>Cerrar sesión</strong>
                      <em>El proveedor de identidad se integra en M10</em>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
