import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStaffMember,
  deactivateStaffMember,
  editStaffMember,
  fetchStaff,
  inviteStaffAccount,
  reactivateStaffMember,
} from '../services/dashboardService';
import { roleLabel } from '../services/roles';
import { StaffDetail } from '../components/staff/StaffDetail';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { Dropdown } from '../components/ui/Dropdown';
import { FieldModal } from '../components/ui/FieldModal';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';

const emptyForm = { name: '', title: 'Estoquista', role: 'stock' };

function accountTone(member) {
  if (member.disabled) return 'danger';
  if (member.uid) return 'accent';
  return 'neutral';
}

function accountText(member) {
  if (member.disabled) return 'Desativada';
  if (member.accountStatus === 'invited' || member.accountStatus === 'pending') return 'Convite enviado';
  if (member.uid) return 'Ativa';
  return 'Sem conta';
}

export function StaffPage() {
  const toast = useToast();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = members.find((member) => String(member.id) === String(selectedId)) || null;

  useEffect(() => {
    if (selectedId && !members.some((member) => String(member.id) === String(selectedId))) {
      setSelectedId(null);
    }
  }, [members, selectedId]);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['staff'] });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  }

  function openEdit(member) {
    setEditingId(member.id);
    setForm({
      name: member.name || '',
      title: member.title || '',
      role: member.role === 'admin' ? 'admin' : 'stock',
    });
    setError('');
    setFormOpen(true);
  }

  function confirmDeactivate(member) {
    openModal('confirm', {
      message: `Desativar ${member.name}? O login deste bar para de funcionar.`,
      confirmLabel: 'Desativar',
      successMessage: 'Funcionário desativado.',
      errorMessage: 'Falha ao desativar.',
      onConfirm: async () => {
        await deactivateStaffMember(member.id);
        refresh();
      },
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await editStaffMember(editingId, form);
        toast.success('Funcionário atualizado.');
      } else {
        const created = await addStaffMember(form);
        setSelectedId(created.id);
        toast.success('Funcionário cadastrado. A conta fica na aba Conta.');
      }
      setFormOpen(false);
      refresh();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando equipe...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Equipe da casa"
        description="Funcionários do bar. A conta é opcional e chega por e-mail."
      >
        <Button onClick={openCreate}>
          <Icon name="add" />
          Novo funcionário
        </Button>
      </PageHeader>

      <DataTable>
        <THead>
          <Th>Nome</Th>
          <Th>E-mail</Th>
          <Th>Cargo</Th>
          <Th>Papel</Th>
          <Th>Conta</Th>
          <Th align="right">Ações</Th>
        </THead>
        <TBody>
          {members.length === 0 ? (
            <EmptyRow colSpan={6}>Nenhum funcionário da casa.</EmptyRow>
          ) : (
            members.map((member) => (
              <Tr key={member.id || member.uid || member.email} onClick={() => setSelectedId(member.id)}>
                <Td tone="strong">{member.name}</Td>
                <Td tone="muted" className="max-w-[10rem] truncate">{member.email || '—'}</Td>
                <Td>{member.title || '—'}</Td>
                <Td>
                  <StatusPill tone="accent">{roleLabel(member.role)}</StatusPill>
                </Td>
                <Td>
                  <StatusPill tone={accountTone(member)}>{accountText(member)}</StatusPill>
                </Td>
                <Td align="right">
                  <TableActions>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label={`Editar ${member.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(member);
                      }}
                    >
                      <Icon name="edit" />
                    </Button>
                    {member.disabled ? null : (
                      <Button
                        type="button"
                        size="icon"
                        variant="danger"
                        aria-label={`Desativar ${member.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmDeactivate(member);
                        }}
                      >
                        <Icon name="delete" />
                      </Button>
                    )}
                  </TableActions>
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </DataTable>

      {formOpen ? (
        <FieldModal
          title={editingId ? 'Editar funcionário' : 'Novo funcionário'}
          icon="badge"
          onClose={() => setFormOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Nome"
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              label="Cargo"
              name="title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <div className="space-y-2">
              <p className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">Papel</p>
              <Dropdown
                label="Papel"
                muted
                value={form.role}
                onChange={(role) => setForm((prev) => ({ ...prev, role }))}
                options={[
                  { value: 'stock', label: 'Funcionário (estoque)' },
                  { value: 'admin', label: 'Administrador' },
                ]}
              />
            </div>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </FieldModal>
      ) : null}

      {selected ? (
        <StaffDetail
          member={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => openEdit(selected)}
          onDeactivate={() => confirmDeactivate(selected)}
          onReactivate={async () => {
            try {
              await reactivateStaffMember(selected.id);
              toast.success('Funcionário reativado.');
              refresh();
            } catch (err) {
              toast.error(err?.message || 'Falha ao reativar.');
            }
          }}
          onInvite={async (payload) => {
            try {
              await inviteStaffAccount(selected.id, payload);
              toast.success('E-mail enviado com o link para criar a senha.');
              refresh();
            } catch (err) {
              if (err?.staff) refresh();
              throw err;
            }
          }}
        />
      ) : null}
    </div>
  );
}
