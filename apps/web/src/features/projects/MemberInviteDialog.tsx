import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { DirectoryUser, ProjectMemberRole, ProjectRecord } from '@/types/project';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { avatarTone, memberRoleMeta, resolveUser } from '@/features/projects/model';

interface MemberInviteDialogProps {
  project: ProjectRecord;
  users: DirectoryUser[];
  onClose: () => void;
  onSubmit: (userId: string, role: ProjectMemberRole) => void;
}

const INVITABLE_ROLES: ProjectMemberRole[] = ['engineer', 'reviewer', 'reader'];

export function MemberInviteDialog({ project, users, onClose, onSubmit }: MemberInviteDialogProps) {
  const available = useMemo(
    () =>
      users.filter(
        (user) => !project.members.some((member) => member.userId === user.id),
      ),
    [project.members, users],
  );

  const [userId, setUserId] = useState(available[0]?.id ?? '');
  const [role, setRole] = useState<ProjectMemberRole>('engineer');
  const [attempted, setAttempted] = useState(false);

  const selectRef = useRef<HTMLSelectElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const selected = resolveUser(users, userId);
  const canSubmit = Boolean(selected);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!canSubmit) return;
    onSubmit(userId, role);
  };

  return (
    <div
      className="ds-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ds-modal__panel ds-modal__panel--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pj-invite-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ds-modal__head">
          <div>
            <p className="ds-modal__eyebrow">M02 · Miembros y permisos</p>
            <h2 id="pj-invite-title">Añadir miembro</h2>
            <p className="ds-modal__lede">
              El acceso se limita a {project.name}. El rol se puede ajustar después desde la pestaña de
              miembros.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <form className="ds-form" onSubmit={handleSubmit} noValidate>
          <div className="ds-modal__body">
            {available.length === 0 ? (
              <div className="empty pj-empty">
                <Icon name="users" />
                <h3>Todo el directorio ya tiene acceso</h3>
                <p>No quedan personas disponibles para añadir a este proyecto.</p>
              </div>
            ) : (
              <>
                <div className="ds-field">
                  <label htmlFor="pj-invite-user">Persona</label>
                  <select
                    id="pj-invite-user"
                    ref={selectRef}
                    className="ds-input"
                    value={userId}
                    aria-invalid={attempted && !canSubmit}
                    onChange={(event) => setUserId(event.target.value)}
                  >
                    {available.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} · {user.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-field">
                  <label htmlFor="pj-invite-role">Rol en el proyecto</label>
                  <select
                    id="pj-invite-role"
                    className="ds-input"
                    value={role}
                    onChange={(event) => setRole(event.target.value as ProjectMemberRole)}
                  >
                    {INVITABLE_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {memberRoleMeta[option].label}
                      </option>
                    ))}
                  </select>
                  <p className="ds-form__hint">{memberRoleMeta[role].hint}</p>
                </div>

                {selected ? (
                  <div className="pj-invite-preview">
                    <span className="pj-avatar" data-tone={avatarTone(selected.id)} aria-hidden="true">
                      {selected.initials}
                    </span>
                    <span className="pj-invite-preview__text">
                      <strong>{selected.displayName}</strong>
                      <span>
                        {selected.email} · {selected.title}
                      </span>
                    </span>
                    <Icon name="mail" size={16} />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <footer className="ds-modal__foot">
            <span className="ds-modal__foot-note">
              <Icon name="lock" size={14} />
              Solo el responsable del proyecto puede administrar el acceso.
            </span>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              <Icon name="userPlus" size={16} />
              Añadir al proyecto
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
