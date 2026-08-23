import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';
import { BAR_PERMISSIONS } from '../services/staffPermissions';

function permissionLabels(ids) {
  return BAR_PERMISSIONS.filter((item) => (ids || []).includes(item.id)).map((item) => item.label);
}

export function TeamPage() {
  const { api, tenantId, canManageStaff } = useDashboardApi();
  const queryClient = useQueryClient();
  const { openModal } = useModal();

  const { data, isLoading } = useQuery({
    queryKey: ['staff', tenantId],
    queryFn: api.fetchStaff,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['staff', tenantId] });
  }

  if (isLoading || !data) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo a equipe...</p>;
  }

  const people = data.people || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase tracking-wide">Equipe</h2>
          <p className="text-sm text-[var(--muted,#5c5c5c)]">
            Cadastre funcionários para entrar em /login/bar com permissões próprias. Não é a vitrine.
          </p>
        </div>
        {canManageStaff ? (
          <Button onClick={() => openModal('new-staff', { onSuccess: refresh })}>
            Novo funcionário
          </Button>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <table className="bar-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Acessos</th>
              {canManageStaff ? <th className="text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.email}</td>
                <td>{person.title}</td>
                <td>
                  <span className="text-xs text-[var(--muted,#5c5c5c)]">
                    {permissionLabels(person.permissions).join(' · ') || 'Nenhum'}
                  </span>
                </td>
                {canManageStaff ? (
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="min-h-11 px-3 bar-sticker"
                        onClick={() =>
                          openModal('edit-staff', { person, onSuccess: refresh })
                        }
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="min-h-11 min-w-11 px-2"
                        aria-label={`Excluir ${person.name}`}
                        onClick={() =>
                          openModal('confirm', {
                            message: `Remover o acesso de ${person.name}?`,
                            confirmLabel: 'Excluir',
                            successMessage: 'Funcionário removido.',
                            errorMessage: 'Falha ao remover.',
                            onConfirm: async () => {
                              await api.removeStaff(person.id);
                              refresh();
                            },
                          })
                        }
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {!people.length ? (
              <tr>
                <td colSpan={canManageStaff ? 5 : 4} className="text-[var(--muted,#5c5c5c)]">
                  Nenhum funcionário. O dono cadastra quem pode logar no painel.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { TeamPage as FreelancersPage };
