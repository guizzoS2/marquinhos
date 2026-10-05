import { memo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { 'pt-BR': ptBR },
});

const messages = {
  showMore: (total) => `+${total}`,
  noEventsInRange: 'Nenhum turno neste período.',
};

function FreelancerCalendarComponent({
  events,
  date,
  view,
  label,
  onView,
  onNavigate,
  onSelectFreelancer,
}) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3" aria-label="Período anterior" onClick={() => onNavigate('prev')}>
            <Icon name="chevron_left" />
          </Button>
          <Button variant="secondary" className="px-3" onClick={() => onNavigate('today')}>
            Hoje
          </Button>
          <Button variant="secondary" className="px-3" aria-label="Próximo período" onClick={() => onNavigate('next')}>
            <Icon name="chevron_right" />
          </Button>
        </div>
        <p className="font-headline font-bold text-on-surface capitalize">{label}</p>
        <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl">
          <button
            type="button"
            onClick={() => onView('month')}
            className={
              view === 'month'
                ? 'px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                : 'px-4 min-h-11 rounded-xl text-on-surface-variant'
            }
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => onView('week')}
            className={
              view === 'week'
                ? 'px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                : 'px-4 min-h-11 rounded-xl text-on-surface-variant'
            }
          >
            Semanal
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={view === 'week' ? 'min-w-[720px] h-[36rem]' : 'h-[36rem]'}>
          <Calendar
            localizer={localizer}
            events={events}
            date={date}
            view={view}
            views={['month', 'week']}
            toolbar={false}
            drilldownView={null}
            culture="pt-BR"
            messages={messages}
            popup
            onNavigate={() => {}}
            onView={() => {}}
            onSelectEvent={(event) => onSelectFreelancer(event.resource.freelancerId)}
            eventPropGetter={() => ({ className: '!bg-primary !text-on-primary' })}
          />
        </div>
      </div>
    </section>
  );
}

export const FreelancerCalendar = memo(FreelancerCalendarComponent);
