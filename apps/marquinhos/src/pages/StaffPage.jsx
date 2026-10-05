import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStaff,
  fetchStaff,
  inviteStaff,
  removeStaff,
  saveStaffAccess,
  updateStaff,
} from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { HouseStaffDialog } from '../components/staff/HouseStaffDialog';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { HOUSE_PERMISSIONS, isBarOwner } from '../services/roles';
import { formatCents } from '../services/cashFlowUtils';
import {
  filterStaffPeople,
  formatIsoBr,
  nextPayrollDate,
  staffAccountLabel,
} from '@fnl/dashboard/staffPayroll';

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

function chipClass(on) {
  return on
    ? 'min-h-11 px-4 rounded-full bg-primary text-on-primary font-semibold'
    : 'min-h-11 px-4 rounded-full bg-surface-container-low text-on-surface font-semibold';
}

export function StaffPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const canManage = isBarOwner(user);
  const [query, setQuery] = useState('');
  const [contractType, setContractType] = useState('all');
  const [contract, setContract] = useState('all');
  const [account, setAccount] = useState('all');
  const [dialog, setDialog] = useState(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
  });

  const visible = useMemo(
    () => filterStaffPeople(people, { query, contractType, contract, account }),
    [people, query, contractType, contract, account]
  );

  function refresh(saved) {
    queryClient.invalidateQueries({ queryKey: ['staff'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    if (saved) setDialog({ person: saved, mode: 'view' });
  }

  function askDelete(person) {
    openModal('confirm', {
      message: `Remover ${person.name} da equipe? O salário futuro sai do caixa. O que já venceu fica.`,
      confirmLabel: 'Excluir',
      successMessage: 'Funcionário removido.',
      errorMessage: 'Falha ao remover.',
      onConfirm: async () => {
        await removeStaff(person.id);
        setDialog(null);
        refresh();
      },
    });
  }

  if (isLoading) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando equipe...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Equipe da casa</h1>
          <p className="text-on-surface-variant text-sm">
            Funcionários CLT e PJ. Freela não entra nesta lista.
          </p>
        </div>
        {canManage ? (
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
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
        />
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((item) => (
            <button key={item.id} type="button" className={chipClass(contractType === item.id)} onClick={() => setContractType(item.id)}>
              {item.label}
            </button>
          ))}
          {contractFilters.map((item) => (
            <button key={item.id} type="button" className={chipClass(contract === item.id)} onClick={() => setContract(item.id)}>
              {item.label}
            </button>
          ))}
          {accountFilters.map((item) => (
            <button key={item.id} type="button" className={chipClass(account === item.id)} onClick={() => setAccount(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant">
              <th className="py-3 pr-3 font-semibold">Nome</th>
              <th className="py-3 pr-3 font-semibold">Tipo</th>
              <th className="py-3 pr-3 font-semibold">Custo</th>
              <th className="py-3 pr-3 font-semibold">Vigência</th>
              <th className="py-3 pr-3 font-semibold">Pagamento</th>
              <th className="py-3 pr-3 font-semibold">Conta</th>
              {canManage ? <th className="py-3 font-semibold text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr
                key={person.id}
                className="border-t border-outline-variant cursor-pointer"
                onClick={() => setDialog({ person, mode: 'view' })}
              >
                <td className="py-3 pr-3 font-bold">{person.name}</td>
                <td className="py-3 pr-3">{typeLabel(person.contractType)}</td>
                <td className="py-3 pr-3">{formatCents(person.monthlyCostCents || 0)}</td>
                <td className="py-3 pr-3">{formatIsoBr(person.contractStart)} – {formatIsoBr(person.contractEnd)}</td>
                <td className="py-3 pr-3">{formatIsoBr(nextPayrollDate(person))}</td>
                <td className="py-3 pr-3">{staffAccountLabel(person)}</td>
                {canManage ? (
                  <td className="py-3 text-right">
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
                <td colSpan={canManage ? 7 : 6} className="py-6 text-on-surface-variant">
                  Nenhum funcionário neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {dialog ? (
        <HouseStaffDialog
          person={dialog.person}
          mode={dialog.mode}
          canManage={canManage}
          permissions={HOUSE_PERMISSIONS}
          onClose={() => setDialog(null)}
          onSaveInfo={async (form) => {
            const saved = dialog.person?.id
              ? await updateStaff(dialog.person.id, form)
              : await createStaff(form);
            toast.success(dialog.person?.id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
            refresh(saved);
          }}
          onInvite={async (form) => {
            try {
              const saved = await inviteStaff(dialog.person.id, form);
              toast.success('Convite enviado.');
              refresh(saved);
            } catch (err) {
              if (err?.staff) refresh(err.staff);
              throw err;
            }
          }}
          onSaveAccess={async (form) => {
            const saved = await saveStaffAccess(dialog.person.id, form);
            toast.success('Permissões salvas.');
            refresh(saved);
          }}
          onDelete={() => askDelete(dialog.person)}
        />
      ) : null}
    </div>
  );
}
