import { Icon } from '../ui/Icon';

function StatusBadge({ status, label }) {
  if (status === 'on_shift') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-[11px] font-bold uppercase tracking-wider shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        {label}
      </span>
    );
  }

  if (status === 'pending_payment') {
    return (
      <span className="px-3 py-1 rounded-full bg-error-container/20 text-on-error-container text-[11px] font-bold uppercase tracking-wider shrink-0">
        {label}
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-[11px] font-bold uppercase tracking-wider shrink-0">
      {label}
    </span>
  );
}

export function FreelancerRoster({ people, onOpen }) {
  if (!people.length) {
    return <p className="text-on-surface-variant">Nenhum freelancer encontrado.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {people.map((person) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onOpen(person.id)}
          className={`w-full text-left bg-surface-container-lowest rounded-2xl p-6 min-h-11 transition-all hover:shadow-xl hover:shadow-on-surface/5 ${
            person.status === 'pending_payment' ? 'border-l-4 border-error-container/40' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-6 gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <img
                alt=""
                className="w-14 h-14 rounded-2xl object-cover shrink-0"
                src={person.image}
              />
              <div className="min-w-0">
                <h4 className="font-headline font-bold text-lg text-on-surface truncate">{person.name}</h4>
                <p className="text-sm text-on-surface-variant font-label">{person.role}</p>
                {person.contact ? (
                  <p className="text-sm text-on-surface-variant">{person.contact}</p>
                ) : null}
              </div>
            </div>
            <StatusBadge status={person.status} label={person.statusLabel} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-on-surface-variant font-label mb-1">Valor diária</p>
              <p className="text-xl font-headline font-extrabold text-on-surface">{person.dailyRate}</p>
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </div>
        </button>
      ))}
    </div>
  );
}
