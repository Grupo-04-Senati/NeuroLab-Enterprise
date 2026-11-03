import type { Actor } from '@/types/domain';
import type { DirectoryUser, ProjectMemberRole, ProjectRecord } from '@/types/project';
import { formatDate } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import {
  ACCESS_MATRIX,
  avatarTone,
  canManageMembers,
  memberRoleMeta,
  projectMemberUsers,
} from '@/features/projects/model';

interface ProjectMembersTabProps {
  project: ProjectRecord;
  users: DirectoryUser[];
  actor: Actor;
  onChangeRole: (userId: string, role: ProjectMemberRole) => void;
  onRemoveMember: (userId: string) => void;
}

const ROLES: ProjectMemberRole[] = ['engineer', 'reviewer', 'reader'];

export function ProjectMembersTab({
  project,
  users,
  actor,
  onChangeRole,
  onRemoveMember,
}: ProjectMembersTabProps) {
  const members = projectMemberUsers(project, users);
  const canManage = canManageMembers(project, actor);

  return (
    <div className="pj-members-tab">
      <div className="pj-members-summary">
        <span>
          <strong>{members.length}</strong> {members.length === 1 ? 'persona con acceso' : 'personas con acceso'}
        </span>
        <span className="pj-members-summary__roles">
          {(['owner', 'engineer', 'reviewer', 'reader'] as ProjectMemberRole[]).map((role) => {
            const count = project.members.filter((member) => member.role === role).length;
            if (count === 0) return null;
            return (
              <Chip key={role} tone={memberRoleMeta[role].tone}>
                {count} {memberRoleMeta[role].short.toLowerCase()}
                {count === 1 ? '' : role === 'reviewer' ? 'es' : 's'}
              </Chip>
            );
          })}
        </span>
      </div>

      <ul className="pj-member-list">
        {members.map(({ member, user }) => {
          const isOwner = member.role === 'owner';
          const isSelf = user.id === actor.id;
          const editable = canManage && !isOwner;

          return (
            <li key={user.id} className="pj-member">
              <span className="pj-avatar" data-tone={avatarTone(user.id)} aria-hidden="true">
                {user.initials}
              </span>

              <span className="pj-member__identity">
                <strong>
                  {user.displayName}
                  {isSelf ? <span className="pj-you">tú</span> : null}
                </strong>
                <span>
                  {user.email} · {user.title}
                </span>
              </span>

              <span className="pj-member__role">
                {editable ? (
                  <label className="pj-role-field">
                    <span className="u-sr-only">Rol de {user.displayName}</span>
                    <select
                      className="pj-role-select"
                      value={member.role}
                      onChange={(event) =>
                        onChangeRole(user.id, event.target.value as ProjectMemberRole)
                      }
                    >
                      {(isOwner ? ['owner'] : ROLES).map((option) => (
                        <option key={option} value={option}>
                          {memberRoleMeta[option as ProjectMemberRole].label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <Chip tone={memberRoleMeta[member.role].tone}>
                    {memberRoleMeta[member.role].short}
                  </Chip>
                )}
              </span>

              <span className="pj-member__since">Desde {formatDate(member.addedAt)}</span>

              <span className="pj-member__actions">
                {editable ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon pj-danger"
                    aria-label={`Quitar a ${user.displayName} del proyecto`}
                    title="Quitar del proyecto"
                    onClick={() => onRemoveMember(user.id)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                ) : (
                  <span
                    className="pj-member__lock"
                    title={isOwner ? 'El responsable no se puede quitar' : 'Solo el responsable administra el acceso'}
                  >
                    <Icon name="lock" size={14} />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {!canManage ? (
        <p className="pj-policy-note">
          <Icon name="lock" size={14} />
          Tu rol permite consultar el equipo, pero solo el responsable del proyecto puede añadir, cambiar o
          quitar miembros.
        </p>
      ) : (
        <p className="pj-policy-note">
          <Icon name="shield" size={14} />
          El responsable no se puede quitar y el proyecto siempre conserva un propietario. Los cambios de rol
          se registran en auditoría.
        </p>
      )}

      <section className="pj-block" aria-labelledby="pj-matrix-title">
        <div className="pj-block__head">
          <h3 id="pj-matrix-title">Qué puede hacer cada rol</h3>
          <span className="u-caps">RBAC por proyecto</span>
        </div>
        <div className="table-wrap">
          <table className="pj-perm-table">
            <caption className="u-sr-only">
              Permisos por rol dentro del proyecto: responsable, ingeniero, revisor y lector
            </caption>
            <thead>
              <tr>
                <th scope="col">Acción</th>
                <th scope="col">Responsable</th>
                <th scope="col">Ingeniero</th>
                <th scope="col">Revisor</th>
                <th scope="col">Lector</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_MATRIX.map((rule) => (
                <tr key={rule.capability}>
                  <th scope="row">{rule.capability}</th>
                  {(['owner', 'engineer', 'reviewer', 'reader'] as ProjectMemberRole[]).map((role) => {
                    const allowed = rule.roles.includes(role);
                    return (
                      <td key={role}>
                        {allowed ? (
                          <span className="pj-perm-yes" aria-label="Permitido">
                            Sí
                          </span>
                        ) : (
                          <span className="pj-perm-no" aria-label="No permitido">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ds-note">
          El rol global de la plataforma se gestiona en M10. Este panel administra únicamente el rol dentro
          del proyecto.
        </p>
      </section>
    </div>
  );
}
