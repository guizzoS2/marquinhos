import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFreelancers, removeDaily, removeFreelancer, settleFreelancer } from '../services/dashboardService';
import {
  filterShifts,
  formatPeriodLabel,
  parseIsoDate,
  sameRole,
  shiftAnchor,
} from '../services/freelancerSchedule';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { FreelancerCalendar } from '../components/freelancers/FreelancerCalendar';
import { FreelancerProfile } from '../components/freelancers/FreelancerProfile';
import { FreelancerRoster } from '../components/freelancers/FreelancerRoster';
import { ShiftTable } from '../components/freelancers/ShiftTable';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';

export function FreelancersPage() {
  const queryClient = useQueryClient();
  const { openModal } = useModal();
  const toast = useToast();
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

  async function deleteShift(shift) {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      await removeDaily(shift);
      toast.success('Agendamento excluído.');
      refreshFreelancers();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir o agendamento.');
    }
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
    <div className="p-4 md:p-8 relative space-y-6 md:space-y-8">
      <PageHeader
        title="Gestão de Freelancers"
        description="Coordene turnos, pagamentos e disponibilidade em tempo real."
      >
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
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs
            items={[
              { id: 'calendar', label: 'Calendário' },
              { id: 'list', label: 'Lista' },
            ]}
            value={panel}
            onChange={setPanel}
          />
          <Tabs
            items={[
              { id: 'month', label: 'Mensal' },
              { id: 'week', label: 'Semanal' },
            ]}
            value={calendarView}
            onChange={setCalendarView}
          />
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
        <ShiftTable shifts={shifts} people={people} onEdit={openShift} onDelete={deleteShift} />
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
