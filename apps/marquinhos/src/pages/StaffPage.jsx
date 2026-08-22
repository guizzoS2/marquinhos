import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addStaffMember, fetchStaff } from '../services/dashboardService';
import { roleLabel } from '../services/roles';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      <section className="space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight">Equipe da casa</h1>
        <p className="text-on-surface-variant text-sm">
          Logins internos do bar. Funcionário de estoque não vê caixa nem freelas da plataforma.
        </p>
      </section>

      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-container-lowest rounded-2xl p-4 md:p-6"
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
          <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
            Papel
          </label>
          <select
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="stock">Funcionário (estoque)</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full md:w-auto">
            Cadastrar login
          </Button>
        </div>
        {error ? <p className="text-sm text-error md:col-span-2">{error}</p> : null}
      </form>

      <ul className="space-y-3">
        {members.map((member) => (
          <li
            key={member.uid}
            className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          >
            <div>
              <p className="font-bold">{member.name}</p>
              <p className="text-sm text-on-surface-variant">{member.email}</p>
            </div>
            <p className="text-sm font-medium">{roleLabel(member.role)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
