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
import { DataTable, EmptyRow, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchField } from '../components/ui/SearchField';
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
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Equipe da casa"
        description="Funcionários CLT e PJ. Freela não entra nesta lista."
      >
        {canManage ? (
          <Button onClick={() => setDialog({ person: null, mode: 'create' })}>Novo funcionário</Button>
        ) : null}
      </PageHeader>

      <div className="space-y-3">
        <SearchField
          wide
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome"
          label="Buscar funcionário"
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

      <DataTable minWidth="min-w-[720px]">
        <THead>
          <Th>Nome</Th>
          <Th>Tipo</Th>
          <Th>Custo</Th>
          <Th>Vigência</Th>
          <Th>Pagamento</Th>
          <Th>Conta</Th>
          {canManage ? <Th align="right">Ações</Th> : null}
        </THead>
        <TBody>
          {visible.map((person) => (
            <Tr key={person.id} onClick={() => setDialog({ person, mode: 'view' })}>
              <Td tone="strong">{person.name}</Td>
              <Td>{typeLabel(person.contractType)}</Td>
              <Td>{formatCents(person.monthlyCostCents || 0)}</Td>
              <Td>{formatIsoBr(person.contractStart)} – {formatIsoBr(person.contractEnd)}</Td>
              <Td>{formatIsoBr(nextPayrollDate(person))}</Td>
              <Td>{staffAccountLabel(person)}</Td>
              {canManage ? (
                <Td align="right">
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
                </Td>
              ) : null}
            </Tr>
          ))}
          {!visible.length ? (
            <EmptyRow colSpan={canManage ? 7 : 6}>Nenhum funcionário neste filtro.</EmptyRow>
          ) : null}
        </TBody>
      </DataTable>

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
