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
import { FilterBar } from '../components/ui/FilterBar';
import { FilterSelect } from '../components/ui/FilterSelect';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
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
  const [section, setSection] = useState('agenda');
  const [panel, setPanel] = useState('calendar');
  const [calendarView, setCalendarView] = useState('month');
  const [profileId, setProfileId] = useState(null);
  const [rosterView, setRosterView] = useState('cards');

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
  const roleOptions = useMemo(
    () => [{ value: '', label: 'Todas' }, ...roles.map((role) => ({ value: role, label: role }))],
    [roles]
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
    <div className="p-4 md:p-8 relative space-y-6">
      <PageHeader
        title="Gestão de freelancers"
        description="Coordene turnos, pagamentos e disponibilidade em tempo real."
      />

      <Tabs
        label="Freelancers"
        items={[
          { id: 'agenda', label: 'Agendamentos' },
          { id: 'freelancers', label: 'Freelancers' },
        ]}
        value={section}
        onChange={setSection}
      />

      {section === 'agenda' ? (
      <>
      <FilterBar
        actions={
          <Button onClick={openDaily}>
            <Icon name="add" />
            Registrar diária
          </Button>
        }
      >
        <SegmentedControl
          variant="primary"
          label="Visualização da agenda"
          items={[
            { id: 'calendar', label: 'Calendário' },
            { id: 'list', label: 'Lista' },
          ]}
          value={panel}
          onChange={setPanel}
        />
        <SegmentedControl
          variant="primary"
          label="Período do calendário"
          items={[
            { id: 'month', label: 'Mensal' },
            { id: 'week', label: 'Semanal' },
          ]}
          value={calendarView}
          onChange={setCalendarView}
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="secondary" aria-label="Período anterior" onClick={() => movePeriod('prev')}>
            <Icon name="chevron_left" />
          </Button>
          <p className="text-sm font-semibold leading-5 text-on-surface capitalize">
            {formatPeriodLabel(period, anchor)}
          </p>
          <Button type="button" size="icon" variant="secondary" aria-label="Próximo período" onClick={() => movePeriod('next')}>
            <Icon name="chevron_right" />
          </Button>
        </div>
      </FilterBar>

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
      </>
      ) : (
      <section className="space-y-6">
        <FilterBar
          actions={
            <Button onClick={openCreate}>
              <Icon name="add" />
              Novo freelancer
            </Button>
          }
        >
          <SegmentedControl
            variant="primary"
            label="Visualização dos freelancers"
            items={[
              { id: 'list', label: 'Lista' },
              { id: 'cards', label: 'Cards' },
            ]}
            value={rosterView}
            onChange={setRosterView}
          />
          <FilterSelect
            id="freelancer-role-filter"
            label="Função"
            value={roleFilter || ''}
            onChange={(role) => setRoleFilter(role || null)}
            options={roleOptions}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar freelancer"
            label="Buscar freelancer pelo nome"
          />
        </FilterBar>
        <FreelancerRoster people={roster} onOpen={openProfile} view={rosterView} />
      </section>
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
