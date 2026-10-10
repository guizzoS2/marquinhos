import { memo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

function FreelancerCalendarComponent({ events, date, view, onSelectShift }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-outline bg-surface p-4">
      <div className="overflow-x-auto">
        <div className={`fnl-calendar ${view === 'week' ? 'min-w-[720px] h-[36rem]' : 'h-[36rem]'}`}>
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
            onSelectEvent={(event) => onSelectShift(event.resource.shift)}
          />
        </div>
      </div>
    </section>
  );
}

export const FreelancerCalendar = memo(FreelancerCalendarComponent);
