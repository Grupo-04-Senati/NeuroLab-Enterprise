import { useState } from 'react';
import type { UserRole } from '@/types/domain';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  permissionsByGroup,
  permissionGroups,
  roleDefinitions,
  roleOrder,
} from '@/features/administration/model';

const roleShort: Record<UserRole, string> = {
  admin: 'Admin',
  owner: 'Responsable',
  engineer: 'Ingeniero',
  reviewer: 'Revisor',
  reader: 'Lector',
};

export function PermissionMatrix() {
  const [focus, setFocus] = useState<UserRole | null>(null);
  const assignments = roleDefinitions.reduce(
    (total, role) => total + role.permissions.length,
    0,
  );

  return (
    <div className="adm-embedded">
      <div className="adm-matrix-toolbar">
        <p className="adm-matrix-hint">
          Pulse un rol para resaltar su columna. Los permisos marcados con el escudo afectan al
          acceso directo y se auditan en cada cambio.
        </p>
        <Chip tone="outline">{assignments} asignaciones</Chip>
      </div>

      <div className="adm-matrix-wrap">
        <table className="adm-matrix">
          <thead>
            <tr>
              <th scope="col" className="adm-matrix__perm-head">
                Permiso
              </th>
              {roleOrder.map((role) => {
                const definition = roleDefinitions.find((item) => item.role === role);
                const active = focus === role;
                return (
                  <th key={role} scope="col">
                    <button
                      type="button"
                      className="adm-matrix__role"
                      aria-pressed={active}
                      onClick={() => setFocus(active ? null : role)}
                      title={`${definition?.description ?? ''} · ${definition?.permissions.length ?? 0} permisos`}
                    >
                      <span>{roleShort[role]}</span>
                      <small>{definition?.permissions.length ?? 0}</small>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <GroupRows key={group} group={group} focus={focus} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="panel__note adm-matrix-note">
        Denegar por defecto: toda acción no listada se rechaza en el backend y queda como intento de
        elevación en la auditoría (§11). La matriz se edita desde la tabla de cuentas; aquí solo se
        consulta la política efectiva.
      </p>
    </div>
  );
}

function GroupRows({ group, focus }: { group: (typeof permissionGroups)[number]; focus: UserRole | null }) {
  const items = permissionsByGroup[group];
  return (
    <>
      <tr className="adm-matrix__group">
        <th colSpan={roleOrder.length + 1} scope="colgroup">
          {group}
        </th>
      </tr>
      {items.map((permission) => {
        const grantedBy = roleOrder.filter((role) => {
          const definition = roleDefinitions.find((item) => item.role === role);
          return definition?.permissions.includes(permission.id);
        });
        return (
          <tr key={permission.id}>
            <th scope="row" className="adm-matrix__perm">
              <span className="adm-matrix__perm-label">
                {permission.sensitive ? (
                  <Icon name="shield" size={13} title="Permiso sensible" />
                ) : null}
                {permission.label}
              </span>
              <span className="adm-matrix__perm-hint">{permission.hint}</span>
            </th>
            {roleOrder.map((role) => {
              const granted = grantedBy.includes(role);
              return (
                <td
                  key={role}
                  className="adm-matrix__cell"
                  data-dim={focus !== null && focus !== role}
                  data-granted={granted}
                  title={`${roleShort[role]} · ${granted ? 'concedido' : 'denegado'}`}
                >
                  {granted ? (
                    <Icon name="checkCircle" size={16} />
                  ) : (
                    <Icon name="minus" size={14} />
                  )}
                  <span className="u-sr-only">{granted ? 'Concedido' : 'Denegado'}</span>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
