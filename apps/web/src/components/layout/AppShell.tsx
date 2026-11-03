import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { PlatformDataProvider, usePlatformData } from '@/app/providers';
import { demoActor } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

function ShellFrame() {
  const mode = useLayoutMode();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const { snapshot } = usePlatformData();

  /* El cajón móvil se cierra al navegar y con Escape. */
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mode !== 'drawer') setNavOpen(false);
  }, [mode]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  const liveBadges = {
    M06: (snapshot?.activeJobs.length ?? 0) + (snapshot?.queuedJobs.length ?? 0),
  };

  return (
    <div className="shell" data-mode={mode} data-nav-open={navOpen}>
      <a className="u-skip-link" href="#main-content">
        Saltar al contenido principal
      </a>

      <Sidebar
        mode={mode}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        actor={demoActor}
        liveBadges={liveBadges}
      />

      <button
        type="button"
        className="scrim"
        aria-label="Cerrar navegación"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <div className="workspace">
        <Topbar mode={mode} onOpenNav={() => setNavOpen(true)} />
        <main id="main-content" className="canvas" tabIndex={-1}>
          <div className="canvas__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Proveedor de datos de plataforma: la barra lateral y el encabezado también lo consumen. */
export function AppShell() {
  return (
    <PlatformDataProvider>
      <ShellFrame />
    </PlatformDataProvider>
  );
}
