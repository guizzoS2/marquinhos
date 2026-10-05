import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFreelancers, removeFreelancer, settleFreelancer } from '../services/dashboardService';
import { formatCents, parseMoneyToCents } from '../services/cashFlowUtils';
import {
  filterShifts,
  formatPeriodLabel,
  parseIsoDate,
  shiftAnchor,
  toIsoDate,
} from '../services/freelancerSchedule';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { FreelancerCalendar } from '../components/freelancers/FreelancerCalendar';
import { FreelancerProfile } from '../components/freelancers/FreelancerProfile';
import { ShiftTable } from '../components/freelancers/ShiftTable';
import { useModal } from '../contexts/ModalContext';

const timeFilters = ['Hoje', 'Semana', 'Mês'];

export function FreelancersPage() {
  const queryClient = useQueryClient();
  const { openModal } = useModal();
  const [timeFilter, setTimeFilter] = useState('Hoje');
  const [anchor, setAnchor] = useState(() => new Date());
  const [roleFilter, setRoleFilter] = useState(null);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState('calendar');
  const [calendarView, setCalendarView] = useState('month');
  const [profileId, setProfileId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['freelancers'],
    queryFn: fetchFreelancers,
  });

  const refreshFreelancers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  }, [queryClient]);

  const people = useMemo(() => data?.people || [], [data]);
  const dailies = useMemo(() => data?.dailies || [], [data]);
  const roles = data?.roles?.length ? data.roles : ['Barman', 'Garçom', 'Cozinha'];

  const shifts = useMemo(
    () =>
      filterShifts(dailies, people, {
        period: timeFilter,
        anchor,
        role: roleFilter,
        query,
      })
        .slice()
        .sort((left, right) => String(left.date).localeCompare(String(right.date))),
    [dailies, people, timeFilter, anchor, roleFilter, query]
  );

  const events = useMemo(
    () =>
      shifts.flatMap((shift) => {
        const start = parseIsoDate(shift.date);
        if (!start) return [];
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const person = people.find((item) => String(item.id) === String(shift.freelancerId));
        return [
          {
            id: shift.id || `${shift.freelancerId}-${shift.date}`,
            title: person?.name || 'Freelancer',
            start,
            end,
            allDay: true,
            resource: { freelancerId: shift.freelancerId },
          },
        ];
      }),
    [shifts, people]
  );

  const profile = people.find((person) => String(person.id) === String(profileId)) || null;

  const costsToday = dailies
    .filter((item) => item.date === toIsoDate(new Date()))
    .reduce((sum, item) => sum + parseMoneyToCents(item.value), 0);
  const activeNow = people.filter((person) => person.status === 'on_shift').length;

  const openProfile = useCallback((freelancerId) => {
    setProfileId(freelancerId);
  }, []);

  const movePeriod = useCallback((direction) => {
    if (direction === 'today') {
      setAnchor(new Date());
      return;
    }
    setAnchor((current) => shiftAnchor(current, timeFilter, direction));
  }, [timeFilter]);

  const changeCalendarView = useCallback((next) => {
    setCalendarView(next);
    setTimeFilter(next === 'week' ? 'Semana' : 'Mês');
  }, []);

  function selectPeriod(period) {
    setTimeFilter(period);
    setAnchor(new Date());
    if (period === 'Semana') setCalendarView('week');
    if (period === 'Mês') setCalendarView('month');
  }

  function openCreate() {
    openModal('new-freelancer', { roles, onSuccess: refreshFreelancers });
  }

  function openDaily() {
    openModal('new-daily', { people, roles, onSuccess: refreshFreelancers });
  }

  function openEdit() {
    if (!profile) return;
    openModal('new-freelancer', { person: profile, roles, onSuccess: refreshFreelancers });
  }

  function settlePayment() {
    if (!profile) return;
    openModal('confirm', {
      message: `Dar baixa no pagamento de ${profile.name}?`,
      confirmLabel: 'Dar baixa',
      successMessage: 'Pagamento baixado. Freelancer disponível.',
      errorMessage: 'Falha ao dar baixa.',
      onConfirm: async () => {
        await settleFreelancer(profile.id);
        refreshFreelancers();
      },
    });
  }

  function confirmDelete() {
    if (!profile) return;
    const person = profile;
    openModal('confirm', {
      message: `Excluir o freelancer ${person.name}?`,
      confirmLabel: 'Excluir',
      successMessage: 'Freelancer removido.',
      errorMessage: 'Falha ao excluir freelancer.',
      onConfirm: async () => {
        await removeFreelancer(person.id);
        refreshFreelancers();
        setProfileId(null);
      },
    });
  }

  if (isLoading || !data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando freelancers...</div>;
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 relative">
      <div className="fixed top-0 right-0 w-1/3 h-1/2 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-1/4 h-1/3 bg-secondary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
              Gestão de Freelancers
            </h2>
            <p className="text-on-surface-variant mt-1 font-body">
              Coordene turnos, pagamentos e disponibilidade em tempo real.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar freelancer"
                aria-label="Buscar freelancer pelo nome"
                className="w-full pl-11 pr-4 min-h-11 bg-surface-container-low border-none rounded-full text-sm text-on-surface focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-3">
              <Button onClick={openCreate} className="px-3 sm:px-5">
                <Icon name="person_add" />
                Novo Freelancer
              </Button>
              <Button variant="secondary" onClick={openDaily} className="px-3 sm:px-5">
                <Icon name="assignment_add" />
                Registrar Diária
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary rounded-2xl p-4">
          <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
            Custos Hoje
          </span>
          <p className="text-2xl font-headline font-extrabold text-on-surface">{formatCents(costsToday)}</p>
        </div>
        <div className="bg-secondary/5 rounded-2xl p-4 border border-secondary/10">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
            Ativos Agora
          </span>
          <p className="text-2xl font-headline font-extrabold text-secondary">
            {String(activeNow).padStart(2, '0')}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4 mb-6 p-1 bg-surface-container-low rounded-2xl">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex p-1 gap-1 overflow-x-auto">
              {timeFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectPeriod(item)}
                  className={
                    timeFilter === item
                      ? 'px-4 md:px-6 py-2 min-h-11 rounded-xl bg-primary text-on-primary font-semibold transition-all shrink-0'
                      : 'px-4 md:px-6 py-2 min-h-11 rounded-xl text-on-surface-variant hover:bg-surface-container-highest/50 transition-all shrink-0'
                  }
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-2">
              <button
                type="button"
                aria-label="Período anterior"
                onClick={() => movePeriod('prev')}
                className="min-h-11 min-w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-highest/50"
              >
                <Icon name="chevron_left" />
              </button>
              <p className="text-sm font-semibold text-on-surface capitalize">
                {formatPeriodLabel(timeFilter, anchor)}
              </p>
              <button
                type="button"
                aria-label="Próximo período"
                onClick={() => movePeriod('next')}
                className="min-h-11 min-w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-highest/50"
              >
                <Icon name="chevron_right" />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-label text-on-surface-variant uppercase tracking-widest sm:mr-2">
              Função:
            </span>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                  className={`px-4 py-1.5 min-h-11 rounded-full border border-outline-variant/20 text-sm font-medium hover:bg-surface-container-lowest transition-colors ${
                    roleFilter === role ? 'bg-primary text-on-primary' : ''
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl w-full sm:w-max mb-6">
        <button
          type="button"
          onClick={() => setPanel('calendar')}
          className={
            panel === 'calendar'
              ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
              : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
          }
        >
          Calendário
        </button>
        <button
          type="button"
          onClick={() => setPanel('list')}
          className={
            panel === 'list'
              ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
              : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
          }
        >
          Lista
        </button>
      </div>

      {panel === 'calendar' ? (
        <FreelancerCalendar
          events={events}
          date={anchor}
          view={calendarView}
          label={formatPeriodLabel(timeFilter, anchor)}
          onView={changeCalendarView}
          onNavigate={movePeriod}
          onSelectFreelancer={openProfile}
        />
      ) : (
        <ShiftTable shifts={shifts} people={people} onSelectFreelancer={openProfile} />
      )}

      {profile ? (
        <FreelancerProfile
          person={profile}
          dailies={dailies}
          onClose={() => setProfileId(null)}
          onEdit={openEdit}
          onDelete={confirmDelete}
          onSettle={settlePayment}
        />
      ) : null}
    </div>
  );
}
