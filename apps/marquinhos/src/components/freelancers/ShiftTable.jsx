import { memo } from 'react';
import { formatCents, parseMoneyToCents } from '../../services/cashFlowUtils';
import { formatShiftDate, shiftStatusLabel } from '../../services/freelancerSchedule';
import { Button } from '../ui/Button';
import { DataTable, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';

function ShiftTableComponent({ shifts, people, onEdit, onDelete }) {
  const page = usePagedList(shifts, shifts.map((shift) => shift.id || shift.date).join('|'));

  if (!shifts.length) {
    return (
      <section className="rounded-xl border border-outline bg-surface p-4">
        <p className="text-on-surface-variant">Nenhum turno neste período.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <DataTable minWidth="min-w-[40rem]">
        <THead>
          <Th>Data</Th>
          <Th>Freelancer</Th>
          <Th>Função</Th>
          <Th align="right">Valor</Th>
          <Th>Status</Th>
          <Th align="right">Ações</Th>
        </THead>
        <TBody>
          {page.rows.map((shift) => {
            const person = people.find((item) => String(item.id) === String(shift.freelancerId));
            const statusTone =
              shift.status === 'pending_payment' ? 'danger' : shift.status === 'available' ? 'neutral' : 'accent';
            return (
              <Tr key={shift.id || `${shift.freelancerId}-${shift.date}`}>
                <Td tone="muted">{formatShiftDate(shift.date)}</Td>
                <Td tone="strong">{person?.name || 'Freelancer'}</Td>
                <Td tone="muted">{shift.role || person?.role || '—'}</Td>
                <Td align="right" tone="strong">
                  {formatCents(parseMoneyToCents(shift.value))}
                </Td>
                <Td>
                  <StatusPill tone={statusTone} dot={shift.status === 'on_shift'}>
                    {shiftStatusLabel(shift.status)}
                  </StatusPill>
                </Td>
                <Td align="right" nowrap>
                  <TableActions>
                    <Button type="button" size="icon" variant="secondary" onClick={() => onEdit(shift)} aria-label="Editar agendamento">
                      <Icon name="edit" />
                    </Button>
                    <Button type="button" size="icon" variant="danger" onClick={() => onDelete(shift)} aria-label="Excluir agendamento">
                      <Icon name="delete" />
                    </Button>
                  </TableActions>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </DataTable>
      <Pagination state={page} />
    </section>
  );
}

export const ShiftTable = memo(ShiftTableComponent);
