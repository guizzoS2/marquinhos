import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDaily,
  fetchFreelancers,
  removeFreelancer,
  settleFreelancer,
} from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';

const timeFilters = ['Hoje', 'Semana', 'Mês'];

function StatusBadge({ status, label }) {
  if (status === 'on_shift') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-[11px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        {label}
      </span>
    );
  }

  if (status === 'pending_payment') {
    return (
      <span className="px-3 py-1 rounded-full bg-error-container/20 text-on-error-container text-[11px] font-bold uppercase tracking-wider">
        {label}
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-[11px] font-bold uppercase tracking-wider">
      {label}
    </span>
  );
}

export function FreelancersPage() {
  const queryClient = useQueryClient();
  const { openModal } = useModal();
  const toast = useToast();
  const [timeFilter, setTimeFilter] = useState('Hoje');
  const [roleFilter, setRoleFilter] = useState(null);
  const [form, setForm] = useState({
    freelancerId: '',
    date: '',
    role: 'Barman',
    value: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['freelancers'],
    queryFn: fetchFreelancers,
  });

  const mutation = useMutation({
    mutationFn: createDaily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      setForm({ freelancerId: '', date: '', role: 'Barman', value: '' });
      toast.success('Diária registrada e despesa lançada.');
    },
    onError: () => {
      toast.error('Falha ao registrar diária.');
    },
  });

  const people = useMemo(() => {
    if (!data?.people) return [];
    if (!roleFilter) return data.people;
    return data.people.filter((person) =>
      person.role.toLowerCase().includes(roleFilter.toLowerCase())
    );
  }, [data, roleFilter]);

  function refreshFreelancers() {
    queryClient.invalidateQueries({ queryKey: ['freelancers'] });
  }

  function settlePayment(person) {
    openModal('confirm', {
      message: `Dar baixa no pagamento de ${person.name} (${person.dailyRate})?`,
      confirmLabel: 'Dar baixa',
      successMessage: 'Pagamento baixado. Freelancer disponível.',
      errorMessage: 'Falha ao dar baixa.',
      onConfirm: async () => {
        await settleFreelancer(person.id);
        refreshFreelancers();
      },
    });
  }

  function confirmDelete(person) {
    openModal('confirm', {
      message: `Excluir o freelancer ${person.name}?`,
      confirmLabel: 'Excluir',
      successMessage: 'Freelancer removido.',
      errorMessage: 'Falha ao excluir freelancer.',
      onConfirm: async () => {
        await removeFreelancer(person.id);
        refreshFreelancers();
      },
    });
  }

  if (isLoading || !data) {
    return <div className="p-8 text-on-surface-variant">Carregando freelancers...</div>;
  }

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate({
      freelancerId: Number(form.freelancerId) || form.freelancerId,
      date: form.date,
      role: form.role,
      value: Number(form.value),
    });
  }

  return (
    <div className="p-8 lg:p-12 relative">
      <div className="fixed top-0 right-0 w-1/3 h-1/2 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-1/4 h-1/3 bg-secondary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Gestão de Freelancers
          </h2>
          <p className="text-on-surface-variant mt-1 font-body">
            Coordene turnos, pagamentos e disponibilidade em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant relative"
          >
            <Icon name="notifications" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface" />
          </button>
          <Button
            onClick={() =>
              openModal('new-freelancer', {
                onSuccess: refreshFreelancers,
              })
            }
          >
            <Icon name="person_add" />
            + Novo freelancer
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-6 p-1 bg-surface-container-low rounded-2xl">
            <div className="flex p-1 gap-1">
              {timeFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTimeFilter(item)}
                  className={
                    timeFilter === item
                      ? 'px-6 py-2 rounded-xl bg-primary text-on-primary font-semibold transition-all'
                      : 'px-6 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-highest/50 transition-all'
                  }
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pr-4">
              <span className="text-xs font-label text-on-surface-variant uppercase tracking-widest mr-2">
                Função:
              </span>
              <div className="flex gap-2">
                {data.roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                    className={`px-4 py-1.5 rounded-full border border-outline-variant/20 text-sm font-medium hover:bg-surface-container-lowest transition-colors ${
                      roleFilter === role ? 'bg-primary text-on-primary' : ''
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {people.map((person) => (
              <div
                key={person.id}
                className={`bg-surface-container-lowest rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-on-surface/5 group ${
                  person.status === 'pending_payment'
                    ? 'border-l-4 border-error-container/40'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      alt={person.name}
                      className="w-14 h-14 rounded-2xl object-cover"
                      src={person.image}
                    />
                    <div>
                      <h4 className="font-headline font-bold text-lg text-on-surface">
                        {person.name}
                      </h4>
                      <p className="text-sm text-on-surface-variant font-label">{person.role}</p>
                    </div>
                  </div>
                  <StatusBadge status={person.status} label={person.statusLabel} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-on-surface-variant font-label mb-1">Valor Diária</p>
                    <p className="text-xl font-headline font-extrabold text-on-surface">
                      {person.dailyRate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {person.status === 'pending_payment' ? (
                      <button
                        type="button"
                        onClick={() => settlePayment(person)}
                        className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dim transition-all"
                      >
                        <Icon name="payments" className="text-sm" />
                        Dar Baixa
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => confirmDelete(person)}
                      className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
                      aria-label={`Excluir ${person.name}`}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 sticky top-8 shadow-2xl shadow-on-surface/5 border border-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-on-surface">
                <Icon name="assignment_add" />
              </div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Registrar Diária</h3>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
                  Selecionar Freelancer
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
                    value={form.freelancerId}
                    onChange={(e) => setForm((prev) => ({ ...prev, freelancerId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione um profissional</option>
                    {data.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="person_search"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
                  Data do Turno
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-container transition-all"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                  <Icon
                    name="calendar_month"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
                    Função
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-4 pr-10 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
                      value={form.role}
                      onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    >
                      {data.roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="expand_more"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
                    Valor (R$)
                  </label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary-container transition-all font-bold"
                    placeholder="0,00"
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl font-headline font-bold text-lg hover:bg-primary-dim hover:scale-[1.02] active:scale-95 transition-all"
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Confirmando...' : 'Confirmar Agendamento'}
                </button>
                <p className="text-center text-[11px] text-on-surface-variant mt-4 leading-relaxed px-4">
                  Ao confirmar, o valor entra como despesa variável no fluxo de caixa.
                </p>
              </div>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-primary rounded-2xl p-4">
              <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                Custos Hoje
              </span>
              <p className="text-2xl font-headline font-extrabold text-on-surface">
                {data.summary.costsToday}
              </p>
            </div>
            <div className="bg-secondary/5 rounded-2xl p-4 border border-secondary/10">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Ativos Agora
              </span>
              <p className="text-2xl font-headline font-extrabold text-secondary">
                {data.summary.activeNow}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
