import { Link, useLocation } from 'react-router-dom';
import { findNavItem } from '@/lib/nav';
import { Icon } from '@/components/ui/Icon';

/** Migas de pan derivadas de la ruta activa, con el módulo como contexto fijo. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const entry = findNavItem(pathname);
  const subPath = entry && pathname.startsWith(entry.path + '/') ? pathname.slice(entry.path.length + 1) : '';

  const crumbs: string[] = [entry?.label ?? 'NeuroLab'];
  if (subPath) crumbs.push(subPath.replace(/-/g, ' '));

  return (
    <nav aria-label="Ruta de navegación">
      <ol className="breadcrumb">
        <li>
          <Link to="/">Plataforma</Link>
          <Icon className="breadcrumb__sep" name="chevronRight" size={13} strokeWidth={2} />
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb}>
              {isLast ? null : (
                <Icon className="breadcrumb__sep" name="chevronRight" size={13} strokeWidth={2} />
              )}
              {isLast ? (
                <span aria-current="page">{crumb}</span>
              ) : (
                <Link to={entry?.path ?? '/'}>{crumb}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
