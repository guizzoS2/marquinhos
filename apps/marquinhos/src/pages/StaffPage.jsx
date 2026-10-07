import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addStaffMember, fetchStaff } from '../services/dashboardService';
import { roleLabel } from '../services/roles';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { DataTable, EmptyRow, StatusPill, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { Dropdown } from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../contexts/ToastContext';

export function StaffPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
  });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    title: 'Estoquista',
    role: 'stock',
  });
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await addStaffMember(form);
      setForm({ name: '', email: '', password: '', title: 'Estoquista', role: 'stock' });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Usuário da casa cadastrado.');
    } catch (err) {
      const message = err?.message || 'Não foi possível cadastrar.';
      setError(message);
      toast.error(message);
    }
  }

  if (isLoading) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando equipe...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Equipe da casa"
        description="Logins internos do bar. Funcionário de estoque não vê caixa nem freelas da plataforma."
      />

      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface border border-outline rounded-xl p-4 md:p-5"
        onSubmit={handleSubmit}
      >
        <Input
          label="Nome"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <Input
          label="Senha"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <Input
          label="Cargo"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
            Papel
          </label>
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
        <div className="md:col-span-2">
          <Button type="submit" className="w-full md:w-auto">
            <Icon name="add" />
            Cadastrar login
          </Button>
        </div>
        {error ? <p className="text-sm text-error md:col-span-2">{error}</p> : null}
      </form>

      <DataTable>
        <THead>
          <Th>Nome</Th>
          <Th>E-mail</Th>
          <Th>Cargo</Th>
          <Th>Papel</Th>
        </THead>
        <TBody>
          {members.length === 0 ? (
            <EmptyRow colSpan={4}>Nenhum login da casa.</EmptyRow>
          ) : (
            members.map((member) => (
              <Tr key={member.uid}>
                <Td tone="strong">{member.name}</Td>
                <Td tone="muted">{member.email}</Td>
                <Td>{member.title || '—'}</Td>
                <Td>
                  <StatusPill tone="accent">{roleLabel(member.role)}</StatusPill>
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </DataTable>
    </div>
  );
}
