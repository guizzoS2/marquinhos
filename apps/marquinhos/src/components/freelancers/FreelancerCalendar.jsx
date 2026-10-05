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
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6">
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
            onSelectEvent={(event) => onSelectShift(event.resource.shift)}
            eventPropGetter={() => ({ className: '!bg-primary !text-on-primary' })}
          />
        </div>
      </div>
    </section>
  );
}

export const FreelancerCalendar = memo(FreelancerCalendarComponent);
