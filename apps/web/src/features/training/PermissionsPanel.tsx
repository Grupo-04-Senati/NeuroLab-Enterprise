import type { Actor } from '@/types/domain';
import { roleLabels } from '@/lib/nav';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { PERMISSION_ROWS, can, maxPriorityFor, PRIORITY_LABEL } from '@/features/training/model';

/* §6 · "cola y prioridad por permisos". La matriz es la misma que aplica la consola,
   así que lo que aparece habilitado en las tablas es exactamente lo que el rol permite. */

export function PermissionsPanel({ actor }: { actor: Actor }) {
  return (
    <Panel
      title="Permisos sobre la cola"
      subtitle={`Aplicados a su sesión como ${roleLabels[actor.role]} (${actor.email}).`}
      icon="shield"
      body="tight"
      actions={
        <span className="tr-role">
          Prioridad máxima:&nbsp;<strong>{PRIORITY_LABEL[maxPriorityFor(actor)]}</strong>
        </span>
      }
      footer={
        <>
          <span>La consola nunca reescribe el estado de la API: solicita, y el worker confirma.</span>
          <a href="/admin">Matriz completa en M10</a>
        </>
      }
    >
      <div className="table-wrap">
        <table className="table tr-permissions">
          <caption className="u-sr-only">
            Acciones de entrenamiento disponibles para el rol de la sesión
          </caption>
          <thead>
            <tr>
              <th scope="col">Acción</th>
              <th scope="col">Roles permitidos</th>
              <th scope="col" className="is-right">
                Su rol
              </th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => {
              const allowed = can(actor, row.id);
              return (
                <tr key={row.id}>
                  <td data-label="Acción">
                    <span className="table__name">{row.label}</span>
                    <span className="table__sub">{row.note}</span>
                  </td>
                  <td data-label="Roles">
                    <p className="tr-roles">
                      {row.roles.map((role) => (
                        <span key={role} className="tr-roles__item" data-current={role === actor.role || undefined}>
                          {roleLabels[role]}
                        </span>
                      ))}
                    </p>
                  </td>
                  <td data-label="Permitido" className="is-right">
                    <span className="tr-allow" data-ok={allowed || undefined}>
                      <Icon name={allowed ? 'checkCircle' : 'lock'} size={13} />
                      {allowed ? 'Habilitado' : 'Restringido'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tr-permissions__foot">
        <Icon name="info" size={12} />
        Sobre los trabajos que usted encoló puede cancelar y reintentar aunque su rol no permita operar sobre
        trabajos ajenos.
      </p>
    </Panel>
  );
}
