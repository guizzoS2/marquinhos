import { memo } from 'react';
import { formatCents, parseMoneyToCents } from '../../services/cashFlowUtils';
import { formatShiftDate, shiftStatusLabel } from '../../services/freelancerSchedule';

function ShiftTableComponent({ shifts, people, onSelectShift }) {
  if (!shifts.length) {
    return (
      <section className="bg-surface-container-lowest rounded-2xl p-6 md:p-8">
        <p className="text-on-surface-variant">Nenhum turno neste período.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left">
          <thead>
            <tr className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
              <th className="p-4 font-bold">Data</th>
              <th className="p-4 font-bold">Freelancer</th>
              <th className="p-4 font-bold">Função</th>
              <th className="p-4 font-bold">Valor</th>
              <th className="p-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => {
              const person = people.find((item) => String(item.id) === String(shift.freelancerId));
              return (
                <tr
                  key={shift.id || `${shift.freelancerId}-${shift.date}`}
                  tabIndex={0}
                  role="button"
                  className="border-t border-outline-variant/20 cursor-pointer hover:bg-surface-container-low focus:bg-surface-container-low"
                  onClick={() => onSelectShift(shift)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectShift(shift);
                    }
                  }}
                >
                  <td className="p-4 text-on-surface">{formatShiftDate(shift.date)}</td>
                  <td className="p-4 font-semibold text-on-surface">{person?.name || 'Freelancer'}</td>
                  <td className="p-4 text-on-surface-variant">{shift.role || person?.role || '—'}</td>
                  <td className="p-4 font-headline font-bold text-on-surface">
                    {formatCents(parseMoneyToCents(shift.value))}
                  </td>
                  <td className="p-4 text-on-surface-variant">{shiftStatusLabel(shift.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const ShiftTable = memo(ShiftTableComponent);
