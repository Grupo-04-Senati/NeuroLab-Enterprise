import { useMemo, useState } from 'react';
import type { AdminUser, AccountStatus } from '@/types/administration';
import type { UserRole } from '@/types/domain';
import { roleLabels } from '@/lib/nav';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import {
  accountStatusMeta,
  roleDefinitions,
  statusActionMeta,
} from '@/features/administration/model';

interface UsersPanelProps {
  users: AdminUser[];
  currentUserId: string;
  onRoleChange: (userId: string, role: UserRole) => void;
  onToggleStatus: (userId: string) => void;
}

type StatusFilter = AccountStatus | 'ALL';

const statusOrder: AccountStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED', 'LOCKED'];

export function UsersPanel({ users, currentUserId, onRoleChange, onToggleStatus }: UsersPanelProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      ALL: users.length,
      ACTIVE: 0,
      INVITED: 0,
      SUSPENDED: 0,
      LOCKED: 0,
    };
    users.forEach((user) => {
      base[user.status] += 1;
    });
    return base;
  }, [users]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (status !== 'ALL' && user.status !== status) return false;
      if (!term) return true;
      return [user.displayName, user.email, user.id, user.title, roleLabels[user.role]]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [users, status, query]);

  return (
    <Panel
      title="Usuarios y roles"
      subtitle="Altas, rol global y estado de acceso. Cada cambio se registra en la auditoría con actor y objetivo."
      icon="users"
      actions={<Chip tone="outline">{users.length} cuentas</Chip>}
      body="tight"
    >
      <div className="adm-toolbar">
        <label className="adm-search">
          <Icon name="search" size={15} />
          <input
            type="search"
            value={query}
            placeholder="Buscar por nombre, correo o identificador"
            aria-label="Buscar cuentas"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <Icon name="close" size={13} />
            </button>
          ) : null}
        </label>

        <div className="filters" role="group" aria-label="Filtrar por estado de cuenta">
          <button
            type="button"
            className="filter-btn"
            aria-pressed={status === 'ALL'}
            onClick={() => setStatus('ALL')}
          >
            Todas <span className="filter-btn__count">{counts.ALL}</span>
          </button>
          {statusOrder.map((option) => (
            <button
              key={option}
              type="button"
              className="filter-btn"
              aria-pressed={status === option}
              onClick={() => setStatus(option)}
            >
              {accountStatusMeta[option].label}
              <span className="filter-btn__count">{counts[option]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <Icon name="search" size={32} />
          <h3>Sin coincidencias</h3>
          <p>Ajuste la búsqueda o cambie el filtro de estado para ver otras cuentas.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="table adm-table">
            <thead>
              <tr>
                <th scope="col">Cuenta</th>
                <th scope="col">Rol global</th>
                <th scope="col">MFA</th>
                <th scope="col" className="is-right">
                  Proyectos
                </th>
                <th scope="col">Último acceso</th>
                <th scope="col">Estado</th>
                <th scope="col" className="is-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isSelf = user.id === currentUserId;
                const statusMeta = accountStatusMeta[user.status];
                const action = statusActionMeta[user.status];
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="adm-user">
                        <span className="avatar" aria-hidden="true">
                          {user.initials}
                        </span>
                        <div className="adm-user__text">
                          <strong>
                            {user.displayName}
                            {isSelf ? <Chip tone="outline">Consola</Chip> : null}
                          </strong>
                          <span className="u-mono">{user.email}</span>
                          <span title={user.title}>{user.title}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Rol global">
                      <select
                        className="adm-select"
                        value={user.role}
                        disabled={isSelf}
                        aria-label={`Rol global de ${user.displayName}`}
                        title={
                          isSelf
                            ? 'La cuenta de la consola no puede cambiar su propio rol (protección del último administrador).'
                            : 'Cambiar el rol global de la cuenta'
                        }
                        onChange={(event) => onRoleChange(user.id, event.target.value as UserRole)}
                      >
                        {roleDefinitions.map((definition) => (
                          <option key={definition.role} value={definition.role}>
                            {definition.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="MFA">
                      <Chip
                        tone={user.mfaEnabled ? 'completed' : 'outline'}
                        dot={user.mfaEnabled}
                        title={
                          user.mfaEnabled
                            ? 'Segundo factor activo (TOTP)'
                            : 'La cuenta no ha registrado un segundo factor'
                        }
                      >
                        {user.mfaEnabled ? 'Activo' : 'Sin MFA'}
                      </Chip>
                    </td>
                    <td data-label="Proyectos" className="is-right u-mono">
                      {user.projects}
                    </td>
                    <td data-label="Último acceso">
                      {user.lastAccessAt ? (
                        <span title={formatDateTime(user.lastAccessAt)}>
                          {formatRelativeTime(user.lastAccessAt)}
                        </span>
                      ) : (
                        <span className="adm-muted">Nunca</span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <div className="adm-status">
                        <Chip tone={statusMeta.tone} dot title={user.statusReason ?? statusMeta.hint}>
                          {statusMeta.label}
                        </Chip>
                        {user.statusReason ? (
                          <span className="adm-status__reason" title={user.statusReason}>
                            {user.statusReason}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="is-right">
                      {isSelf ? (
                        <span className="adm-self-note">
                          <Icon name="shield" size={13} />
                          Protegida
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => onToggleStatus(user.id)}
                          title={action.label}
                        >
                          {action.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="panel__note adm-panel-note">
        El estado de la cuenta y el rol global son independientes de la pertenencia a proyectos (M02).
        Suspender una cuenta revoca sus sesiones activas; el último administrador no puede
        degradarse ni suspenderse desde esta consola.
      </p>
    </Panel>
  );
}
