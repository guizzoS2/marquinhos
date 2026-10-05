import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFreelancers, removeFreelancer, settleFreelancer } from '../services/dashboardService';
import {
  filterShifts,
  formatPeriodLabel,
  parseIsoDate,
  sameRole,
  shiftAnchor,
} from '../services/freelancerSchedule';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { FreelancerCalendar } from '../components/freelancers/FreelancerCalendar';
import { FreelancerProfile } from '../components/freelancers/FreelancerProfile';
import { FreelancerRoster } from '../components/freelancers/FreelancerRoster';
import { ShiftTable } from '../components/freelancers/ShiftTable';
import { useModal } from '../contexts/ModalContext';

export function FreelancersPage() {
  const queryClient = useQueryClient();
  const { openModal } = useModal();
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
  const roles = useMemo(
    () => (data?.roles?.length ? data.roles : ['Barman', 'Garçom', 'Cozinha']),
    [data]
  );

  const period = calendarView === 'week' ? 'Semana' : 'Mês';

  const shifts = useMemo(
    () =>
      filterShifts(dailies, people, {
        period,
        anchor,
        role: null,
        query: '',
      })
        .slice()
        .sort((left, right) => String(left.date).localeCompare(String(right.date))),
    [dailies, people, period, anchor]
  );

  const roster = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) => {
      if (roleFilter && !sameRole(person.role, roleFilter)) return false;
      if (needle && !String(person.name || '').toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [people, roleFilter, query]);

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
            resource: { shift },
          },
        ];
      }),
    [shifts, people]
  );

  const profile = people.find((person) => String(person.id) === String(profileId)) || null;

  const openProfile = useCallback((freelancerId) => {
    setProfileId(freelancerId);
  }, []);

  const openShift = useCallback(
    (shift) => {
      openModal('shift-detail', {
        shift,
        people,
        roles,
        onSuccess: refreshFreelancers,
      });
    },
    [openModal, people, roles, refreshFreelancers]
  );

  const movePeriod = useCallback(
    (direction) => {
      setAnchor((current) => shiftAnchor(current, period, direction));
    },
    [period]
  );

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

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl">
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
          <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl">
            <button
              type="button"
              onClick={() => setCalendarView('month')}
              className={
                calendarView === 'month'
                  ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                  : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
              }
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('week')}
              className={
                calendarView === 'week'
                  ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                  : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
              }
            >
              Semanal
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Período anterior"
            onClick={() => movePeriod('prev')}
            className="min-h-11 min-w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="chevron_left" />
          </button>
          <p className="text-sm font-semibold text-on-surface capitalize">
            {formatPeriodLabel(period, anchor)}
          </p>
          <button
            type="button"
            aria-label="Próximo período"
            onClick={() => movePeriod('next')}
            className="min-h-11 min-w-11 rounded-xl text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>

      {panel === 'calendar' ? (
        <FreelancerCalendar
          events={events}
          date={anchor}
          view={calendarView}
          onSelectShift={openShift}
        />
      ) : (
        <ShiftTable shifts={shifts} people={people} onSelectShift={openShift} />
      )}

      <section className="mt-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h3 className="font-headline text-xl font-bold text-on-surface">Freelancers</h3>
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
        <FreelancerRoster people={roster} onOpen={openProfile} />
      </section>

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
