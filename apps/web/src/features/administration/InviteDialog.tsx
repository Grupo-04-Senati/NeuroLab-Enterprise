import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { InviteDraft } from '@/types/administration';
import type { UserRole } from '@/types/domain';
import { Icon } from '@/components/ui/Icon';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import {
  initialsOf,
  isEmailValid,
  roleDefinitions,
  validateInvite,
} from '@/features/administration/model';

interface InviteDialogProps {
  existingEmails: string[];
  onClose: () => void;
  onSubmit: (draft: InviteDraft) => void;
}

export function InviteDialog({ existingEmails, onClose, onSubmit }: InviteDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [attempted, setAttempted] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const formError = useMemo(
    () => validateInvite({ displayName, email }, existingEmails),
    [displayName, email, existingEmails],
  );
  const nameError = displayName.trim().length > 0 && displayName.trim().length < 3;
  const emailError = email.trim().length > 0 && !isEmailValid(email);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (formError) {
      if (displayName.trim().length < 3) nameRef.current?.focus();
      return;
    }
    onSubmit({ displayName: displayName.trim(), email: email.trim(), role });
  };

  return (
    <div
      className="adm-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="adm-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-invite-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="adm-modal__head">
          <div>
            <p className="adm-modal__eyebrow">M10 · Administración</p>
            <h2 id="adm-invite-title">Invitar usuario</h2>
            <p className="adm-modal__lede">
              La cuenta se crea en estado <strong>invitada</strong> y solo obtiene acceso cuando
              acepta el enlace enviado a su correo corporativo.
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="adm-modal__body">
            {attempted && formError ? (
              <p className="adm-form__error" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="adm-form-grid">
              <div className="adm-field adm-field--wide">
                <label htmlFor="adm-invite-name">Nombre completo</label>
                <input
                  id="adm-invite-name"
                  ref={nameRef}
                  className="adm-input"
                  type="text"
                  value={displayName}
                  aria-invalid={Boolean(attempted && nameError)}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="p. ej. Valeria Sotomayor Díaz"
                />
                {attempted && nameError ? (
                  <span className="adm-field__error">Escriba al menos 3 caracteres.</span>
                ) : null}
              </div>

              <div className="adm-field adm-field--wide">
                <label htmlFor="adm-invite-email">Correo corporativo</label>
                <input
                  id="adm-invite-email"
                  className="adm-input"
                  type="email"
                  value={email}
                  aria-invalid={Boolean(attempted && emailError)}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre.apellido@neurolab.enterprise"
                />
                {attempted && emailError ? (
                  <span className="adm-field__error">Indique un correo válido.</span>
                ) : null}
              </div>

              <div className="adm-field adm-field--wide">
                <label htmlFor="adm-invite-role">Rol global inicial</label>
                <select
                  id="adm-invite-role"
                  className="adm-input"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  {roleDefinitions.map((definition) => (
                    <option key={definition.role} value={definition.role}>
                      {definition.label} · {definition.permissions.length} permisos
                    </option>
                  ))}
                </select>
                <span className="adm-field__hint">
                  {roleDefinitions.find((definition) => definition.role === role)?.description}
                </span>
              </div>
            </div>

            <div className="adm-invite-preview" aria-hidden="true">
              <span className="avatar">{initialsOf(displayName) || '··'}</span>
              <span>
                <strong>{displayName.trim() || 'Nombre de la persona'}</strong>
                <em>{email.trim() || 'correo@neurolab.enterprise'}</em>
              </span>
            </div>
          </div>

          <footer className="adm-modal__foot">
            <p className="adm-modal__foot-note">
              <Icon name="mail" size={14} />
              La invitación caduca a los 7 días. El alta y el rol elegido quedan en la auditoría.
            </p>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              <Icon name="userPlus" size={16} />
              Enviar invitación
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
