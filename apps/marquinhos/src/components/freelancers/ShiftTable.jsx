import { memo } from 'react';
import { formatCents, parseMoneyToCents } from '../../services/cashFlowUtils';
import { formatShiftDate, shiftStatusLabel } from '../../services/freelancerSchedule';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';

function ShiftTableComponent({ shifts, people, onEdit, onDelete }) {
  const page = usePagedList(shifts, shifts.map((shift) => shift.id || shift.date).join('|'));

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
            <tr className="text-xs font-label uppercase text-on-surface-variant">
              <th className="p-4 font-bold">Data</th>
              <th className="p-4 font-bold">Freelancer</th>
              <th className="p-4 font-bold">Função</th>
              <th className="p-4 font-bold">Valor</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((shift) => {
              const person = people.find((item) => String(item.id) === String(shift.freelancerId));
              return (
                <tr
                  key={shift.id || `${shift.freelancerId}-${shift.date}`}
                  className="border-t border-outline-variant/20"
                >
                  <td className="p-4 text-on-surface">{formatShiftDate(shift.date)}</td>
                  <td className="p-4 font-semibold text-on-surface">{person?.name || 'Freelancer'}</td>
                  <td className="p-4 text-on-surface-variant">{shift.role || person?.role || '—'}</td>
                  <td className="p-4 font-headline font-bold text-on-surface">
                    {formatCents(parseMoneyToCents(shift.value))}
                  </td>
                  <td className="p-4 text-on-surface-variant">{shiftStatusLabel(shift.status)}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => onEdit(shift)}>
                        <Icon name="edit" />
                        Editar
                      </Button>
                      <Button type="button" variant="danger" onClick={() => onDelete(shift)}>
                        <Icon name="delete" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4">
        <Pagination page={page.current} pageCount={page.pageCount} onPage={page.setPage} />
      </div>
    </section>
  );
}

export const ShiftTable = memo(ShiftTableComponent);
