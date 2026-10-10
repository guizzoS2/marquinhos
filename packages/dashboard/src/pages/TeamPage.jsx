import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { StaffDialog } from '../components/ui/StaffDialog';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { BAR_PERMISSIONS } from '../services/staffPermissions';
import { formatCents } from '../services/cashFlowUtils';
import {
  filterStaffPeople,
  formatIsoBr,
  nextPayrollDate,
  staffAccountLabel,
} from '../services/staffPayroll';

const typeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'clt', label: 'CLT' },
  { id: 'pj', label: 'PJ' },
];

const contractFilters = [
  { id: 'all', label: 'Vigência' },
  { id: 'active', label: 'Vigente' },
  { id: 'ended', label: 'Encerrado' },
];

const accountFilters = [
  { id: 'all', label: 'Conta' },
  { id: 'with', label: 'Com conta' },
  { id: 'without', label: 'Sem conta' },
];

function typeLabel(type) {
  if (type === 'pj') return 'PJ';
  if (type === 'clt') return 'CLT';
  return '—';
}

export function TeamPage() {
  const { api, tenantId, canManageStaff } = useDashboardApi();
  const queryClient = useQueryClient();
  const { openModal } = useModal();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [contractType, setContractType] = useState('all');
  const [contract, setContract] = useState('all');
  const [account, setAccount] = useState('all');
  const [dialog, setDialog] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['staff', tenantId],
    queryFn: api.fetchStaff,
  });

  const people = data?.people || [];
  const visible = useMemo(
    () => filterStaffPeople(people, { query, contractType, contract, account }),
    [people, query, contractType, contract, account]
  );

  function refresh(saved) {
    queryClient.invalidateQueries({ queryKey: ['staff', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['overview', tenantId] });
    if (saved) setDialog({ person: saved, mode: 'view' });
  }

  function askDelete(person) {
    openModal('confirm', {
      message: `Remover ${person.name} da equipe? O salário futuro sai do caixa. O que já venceu fica.`,
      confirmLabel: 'Excluir',
      successMessage: 'Funcionário removido.',
      errorMessage: 'Falha ao remover.',
      onConfirm: async () => {
        await api.removeStaff(person.id);
        setDialog(null);
        refresh();
      },
    });
  }

  if (isLoading || !data) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo a equipe...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase tracking-wide">Equipe da casa</h2>
          <p className="text-sm text-[var(--muted,#5c5c5c)]">
            Funcionários CLT e PJ. Freela não entra nesta lista.
          </p>
        </div>
        {canManageStaff ? (
          <Button onClick={() => setDialog({ person: null, mode: 'create' })}>Novo funcionário</Button>
        ) : null}
      </header>

      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar funcionário"
          className="bar-field w-full min-h-11 px-3 py-3"
        />
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((item) => (
            <button key={item.id} type="button" className={contractType === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'} onClick={() => setContractType(item.id)}>
              {item.label}
            </button>
          ))}
          {contractFilters.map((item) => (
            <button key={item.id} type="button" className={contract === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'} onClick={() => setContract(item.id)}>
              {item.label}
            </button>
          ))}
          {accountFilters.map((item) => (
            <button key={item.id} type="button" className={account === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'} onClick={() => setAccount(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="bar-table min-w-[720px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Custo</th>
              <th>Vigência</th>
              <th>Pagamento</th>
              <th>Conta</th>
              {canManageStaff ? <th className="text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr key={person.id} className="cursor-pointer" onClick={() => setDialog({ person, mode: 'view' })}>
                <td className="font-medium">{person.name}</td>
                <td>{typeLabel(person.contractType)}</td>
                <td>{formatCents(person.monthlyCostCents || 0)}</td>
                <td>{formatIsoBr(person.contractStart)} – {formatIsoBr(person.contractEnd)}</td>
                <td>{formatIsoBr(nextPayrollDate(person))}</td>
                <td>{staffAccountLabel(person)}</td>
                {canManageStaff ? (
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="min-h-11 min-w-11"
                        aria-label={`Editar ${person.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDialog({ person, mode: 'edit' });
                        }}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="min-h-11 min-w-11"
                        aria-label={`Excluir ${person.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          askDelete(person);
                        }}
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {!visible.length ? (
              <tr>
                <td colSpan={canManageStaff ? 7 : 6} className="text-[var(--muted,#5c5c5c)]">
                  Nenhum funcionário neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {dialog ? (
        <StaffDialog
          person={dialog.person}
          mode={dialog.mode}
          canManage={canManageStaff}
          permissions={BAR_PERMISSIONS}
          onClose={() => setDialog(null)}
          onSaveInfo={async (form) => {
            const saved = dialog.person?.id
              ? await api.updateStaff(dialog.person.id, form)
              : await api.createStaff(form);
            toast.success(dialog.person?.id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
            refresh(saved);
          }}
          onInvite={async (form) => {
            try {
              const saved = await api.inviteStaff(dialog.person.id, form);
              toast.success('Convite enviado.');
              refresh(saved);
            } catch (err) {
              if (err?.staff) refresh(err.staff);
              throw err;
            }
          }}
          onSaveAccess={async (form) => {
            const saved = await api.saveStaffAccess(dialog.person.id, form);
            toast.success('Permissões salvas.');
            refresh(saved);
          }}
          onDelete={() => askDelete(dialog.person)}
        />
      ) : null}
    </div>
  );
}

export { TeamPage as FreelancersPage };
