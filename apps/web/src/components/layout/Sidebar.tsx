import { NavLink, Link } from 'react-router-dom';
import type { Actor } from '@/types/domain';
import type { LayoutMode } from '@/hooks/useLayoutMode';
import { navGroups, roleLabels, type NavItem } from '@/lib/nav';
import { Icon } from '@/components/ui/Icon';

interface SidebarProps {
  mode: LayoutMode;
  open: boolean;
  onClose: () => void;
  actor: Actor;
  liveBadges: Record<string, number>;
}

function Badge({ count, tone }: { count: number; tone?: 'brand' | 'warning' }) {
  if (count <= 0) return null;
  return <span className="nav__badge" data-tone={tone}>{count}</span>;
}

function NavRow({
  item,
  liveBadges,
  onNavigate,
}: {
  item: NavItem;
  liveBadges: Record<string, number>;
  onNavigate: () => void;
}) {
  const badgeCount = liveBadges[item.moduleId] ?? 0;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      title={`${item.moduleId} · ${item.label}`}
      className="nav__link"
    >
      <Icon className="nav__icon" name={item.icon} size={20} />
      <span className="nav__label">{item.label}</span>
      <Badge count={badgeCount} tone="brand" />
    </NavLink>
  );
}

export function Sidebar({ mode, open, onClose, actor, liveBadges }: SidebarProps) {
  const isDrawer = mode === 'drawer';

  return (
    <aside
      className="nav"
      aria-label="Navegación de módulos"
      aria-hidden={isDrawer && !open ? true : undefined}
    >
      {/* Franja visible con la barra plegada: asa pixelada y pista de menú. */}
      <span className="nav__peek" aria-hidden="true">
        <span className="nav__peek-grip">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="nav__peek-label">Menú</span>
      </span>

      <div className="nav__inner">
        <button type="button" className="nav__close" onClick={onClose} aria-label="Cerrar navegación">
          <Icon name="close" size={18} />
        </button>

        <Link to="/" className="nav__brand" onClick={onClose}>
          <span className="nav__logo">
            <img src="/logo-mark.png" alt="" width={26} height={26} />
          </span>
          <span className="nav__brand-text">
            <strong>NeuroLab</strong>
            <span>Enterprise ML</span>
          </span>
        </Link>

        <nav className="nav__scroll">
          {navGroups.map((group) => (
            <div className="nav__group" key={group.label}>
              <p className="nav__group-label">{group.label}</p>
              <ul className="nav__list">
                {group.items.map((item) => (
                  <li key={item.moduleId}>
                    <NavRow item={item} liveBadges={liveBadges} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="nav__footer">
          <button type="button" className="nav__user" title={`${actor.email} · ${roleLabels[actor.role]}`}>
            <span className="avatar" aria-hidden="true">
              {actor.initials}
            </span>
            <span className="nav__user-meta">
              <strong>{actor.displayName}</strong>
              <span>{roleLabels[actor.role]}</span>
            </span>
          </button>
          <p className="nav__release">
            <span>v1.0.0</span>
            <span>entorno: demo</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
