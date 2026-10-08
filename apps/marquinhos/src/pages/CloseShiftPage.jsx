import { useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, fetchInventory, closeCashShift } from '../services/dashboardService';
import {
  formatDayLabel,
  latestCutoff,
  openMovements,
  pendingDays,
  settledInWindow,
  sumReais,
  totalsInWindow,
  windowFor,
} from '../services/cashClose';
import { PAYMENT_OPTIONS } from '../services/inventoryProduct';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { DateField } from '../components/ui/DateField';
import { Dropdown } from '../components/ui/Dropdown';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { usePagedList } from '../components/ui/usePagedList';
import { useToast } from '../contexts/ToastContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function stamp(value) {
  const date = parseISO(String(value || ''));
  if (!isValid(date)) return '—';
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

function FieldLabel({ children }) {
  return <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">{children}</p>;
}

export function CloseShiftPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [modo, setModo] = useState('dia');
  const [day, setDay] = useState(todayKey);
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(null);

  const open = useMemo(
    () => openMovements(cash.data?.incomes, cash.data?.expenses, inventory.data?.closings),
    [cash.data, inventory.data]
  );
  const days = useMemo(() => pendingDays(open.incomes, open.expenses), [open]);
  const dayList = days.join('|');

  useEffect(() => {
    if (!dayList) return;
    const list = dayList.split('|');
    const next = list.includes(todayKey) ? todayKey : list[list.length - 1];
    setModo('dia');
    setDay(next);
    setTime(next === todayKey ? format(new Date(), 'HH:mm') : '23:59');
  }, [dayList, todayKey]);

  const span = useMemo(
    () =>
      windowFor({
        modo: days.length > 1 ? modo : 'dia',
        day,
        time,
        openIncomes: open.incomes,
        openExpenses: open.expenses,
      }),
    [modo, day, time, open, days.length]
  );
  const cutoff = latestCutoff(inventory.data?.closings);
  const saleRange = span.error || !span.until ? null : { from: cutoff, until: span.until, day: span.day };
  const totais = saleRange
    ? totalsInWindow(inventory.data?.sales, saleRange)
    : { byMethod: {}, total: 0 };
  const produtos = saleRange ? settledInWindow(inventory.data?.sales, saleRange) : [];
  const entradas = sumReais(span.incomes);
  const saidas = sumReais(span.expenses);
  const saldo = Math.round((entradas - saidas) * 100) / 100;
  const incomePage = usePagedList(span.incomes, span.incomes.map((row) => row.id).join('|'));
  const expensePage = usePagedList(span.expenses, span.expenses.map((row) => row.id).join('|'));
  const closings = useMemo(() => {
    return [...(inventory.data?.closings || [])].sort((left, right) =>
      String(right.until || right.closed_at || '').localeCompare(String(left.until || left.closed_at || ''))
    );
  }, [inventory.data]);
  const historyPage = usePagedList(closings, closings.map((row) => row.id).join('|'));

  function chooseModo(next) {
    setModo(next);
    if (next === 'varios') {
      setDay(todayKey);
      setTime(format(new Date(), 'HH:mm'));
      return;
    }
    const picked = days.includes(todayKey) ? todayKey : days[days.length - 1];
    setDay(picked);
    setTime(picked === todayKey ? format(new Date(), 'HH:mm') : '23:59');
  }

  function chooseDay(next) {
    setDay(next);
    setTime(next === todayKey ? format(new Date(), 'HH:mm') : '23:59');
  }

  async function consolidate() {
    setSaving(true);
    try {
      await closeCashShift({ modo: days.length > 1 ? modo : 'dia', day, time });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
      toast.success('Caixa fechado.');
      setReading(null);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível fechar o caixa.');
    } finally {
      setSaving(false);
    }
  }

  if (cash.isLoading || inventory.isLoading || !cash.data || !inventory.data) {
    return <p className="text-on-surface-variant">Carregando fechamento...</p>;
  }

  const several = days.length > 1;

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <p className="text-sm text-on-surface-variant">
          {cutoff
            ? `Aberto desde ${stamp(cutoff)}. O horário escolhido entra no fechamento. O que vier depois continua aberto.`
            : 'Ainda não há fechamento. O horário escolhido entra neste caixa. O que vier depois continua aberto.'}
        </p>
        {days.length === 0 ? (
          <p className="rounded-2xl border border-outline p-4 text-sm text-on-surface-variant">Nada pendente de fechamento.</p>
        ) : (
          <>
            {several ? (
              <SegmentedControl
                label="Período do fechamento"
                items={[
                  { id: 'dia', label: 'Um dia' },
                  { id: 'varios', label: 'Vários dias' },
                ]}
                value={modo}
                onChange={chooseModo}
              />
            ) : null}
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              {modo === 'varios' && several ? (
                <DateField label="Até o dia" value={day} onChange={setDay} max={todayKey} />
              ) : several ? (
                <div className="space-y-2">
                  <FieldLabel>Dia</FieldLabel>
                  <Dropdown
                    label="Dia"
                    muted
                    value={day}
                    onChange={chooseDay}
                    options={days.map((item) => ({ value: item, label: formatDayLabel(item) }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <FieldLabel>Dia</FieldLabel>
                  <p className="flex h-11 items-center rounded-2xl border border-outline bg-surface-container-low px-4 text-sm font-semibold text-on-surface">
                    {formatDayLabel(days[0])}
                  </p>
                </div>
              )}
              <Input label="Horário" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
            {span.error ? <p className="text-sm font-medium text-error">{span.error}</p> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-outline p-4">
                <FieldLabel>Entradas</FieldLabel>
                <p className="font-headline text-2xl font-extrabold text-on-surface">{money(entradas)}</p>
              </div>
              <div className="rounded-2xl border border-outline p-4">
                <FieldLabel>Saídas</FieldLabel>
                <p className="font-headline text-2xl font-extrabold text-on-surface">{money(saidas)}</p>
              </div>
              <div className="rounded-2xl border border-outline p-4">
                <FieldLabel>Saldo</FieldLabel>
                <p className={`font-headline text-2xl font-extrabold ${saldo < 0 ? 'text-error' : 'text-on-surface'}`}>
                  {money(saldo)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-headline text-xl font-bold text-on-surface">Entradas</h3>
              <DataTable>
                <THead>
                  <Th>Data</Th>
                  <Th>Descrição</Th>
                  <Th align="right">Valor</Th>
                </THead>
                <TBody>
                  {span.incomes.length === 0 ? (
                    <EmptyRow colSpan={3}>Nenhuma entrada nesse horário.</EmptyRow>
                  ) : (
                    incomePage.rows.map((row) => (
                      <Tr key={row.id}>
                        <Td tone="muted" className="whitespace-nowrap">
                          {row.date || stamp(row.createdAt)}
                        </Td>
                        <Td tone="strong">{row.description || '—'}</Td>
                        <Td align="right" tone="strong">
                          {row.value}
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </DataTable>
              <Pagination state={incomePage} />
            </div>
            <div className="space-y-3">
              <h3 className="font-headline text-xl font-bold text-on-surface">Saídas</h3>
              <DataTable>
                <THead>
                  <Th>Data</Th>
                  <Th>Descrição</Th>
                  <Th align="right">Valor</Th>
                </THead>
                <TBody>
                  {span.expenses.length === 0 ? (
                    <EmptyRow colSpan={3}>Nenhuma saída nesse horário.</EmptyRow>
                  ) : (
                    expensePage.rows.map((row) => (
                      <Tr key={row.id}>
                        <Td tone="muted" className="whitespace-nowrap">
                          {row.date || stamp(row.createdAt)}
                        </Td>
                        <Td tone="strong">{row.description || row.supplier || '—'}</Td>
                        <Td align="right" tone="danger">
                          {row.value}
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </DataTable>
              <Pagination state={expensePage} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-headline text-xl font-bold text-on-surface">Pagamentos</h3>
                <DataTable>
                  <THead>
                    <Th>Forma</Th>
                    <Th align="right">Total</Th>
                  </THead>
                  <TBody>
                    {PAYMENT_OPTIONS.map((method) => (
                      <Tr key={method.value}>
                        <Td>{method.label}</Td>
                        <Td align="right" tone="strong">
                          {money(totais.byMethod[method.value])}
                        </Td>
                      </Tr>
                    ))}
                    <Tr>
                      <Td tone="strong">Recebido</Td>
                      <Td align="right" className="font-headline text-xl font-extrabold">
                        {money(totais.total)}
                      </Td>
                    </Tr>
                  </TBody>
                </DataTable>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-xl font-bold text-on-surface">Produtos</h3>
                <DataTable>
                  <THead>
                    <Th>Produto</Th>
                    <Th align="right">Qtd.</Th>
                    <Th align="right">Valor</Th>
                  </THead>
                  <TBody>
                    {produtos.length === 0 ? (
                      <EmptyRow colSpan={3}>Nenhum produto quitado nesse horário.</EmptyRow>
                    ) : (
                      produtos.map((line) => (
                        <Tr key={line.produto_id || line.nome}>
                          <Td tone="strong">{line.nome}</Td>
                          <Td align="right">{line.quantidade}</Td>
                          <Td align="right" tone="strong">
                            {money(line.valor_total)}
                          </Td>
                        </Tr>
                      ))
                    )}
                  </TBody>
                </DataTable>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={consolidate} disabled={Boolean(span.error) || saving}>
                <Icon name="lock" />
                {saving ? 'Fechando...' : 'Fechar caixa'}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-headline text-xl font-bold text-on-surface">Fechamentos</h3>
        {reading ? (
          <div className="space-y-4 rounded-2xl border border-outline p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                {stamp(reading.from)} – {stamp(reading.until || reading.closed_at)}
              </p>
              <Button type="button" variant="secondary" onClick={() => setReading(null)}>
                <Icon name="close" />
                Fechar
              </Button>
            </div>
            <p className="text-sm text-on-surface">
              Entradas {money(reading.entradas ?? reading.totais?.total)} · Saídas {reading.saidas == null ? '—' : money(reading.saidas)} · Saldo{' '}
              {money(reading.saldo ?? reading.totais?.total)}
            </p>
            {(reading.entradas_linhas || []).length ? (
              <DataTable>
                <THead>
                  <Th>Entrada</Th>
                  <Th align="right">Valor</Th>
                </THead>
                <TBody>
                  {reading.entradas_linhas.map((row) => (
                    <Tr key={row.id}>
                      <Td>{row.description || '—'}</Td>
                      <Td align="right">{row.value}</Td>
                    </Tr>
                  ))}
                </TBody>
              </DataTable>
            ) : null}
            {(reading.saidas_linhas || []).length ? (
              <DataTable>
                <THead>
                  <Th>Saída</Th>
                  <Th align="right">Valor</Th>
                </THead>
                <TBody>
                  {reading.saidas_linhas.map((row) => (
                    <Tr key={row.id}>
                      <Td>{row.description || '—'}</Td>
                      <Td align="right">{row.value}</Td>
                    </Tr>
                  ))}
                </TBody>
              </DataTable>
            ) : null}
          </div>
        ) : null}
        <DataTable>
          <THead>
            <Th>Até</Th>
            <Th align="right">Entradas</Th>
            <Th align="right">Saídas</Th>
            <Th align="right">Saldo</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {closings.length === 0 ? (
              <EmptyRow colSpan={5}>Nenhum fechamento registrado.</EmptyRow>
            ) : (
              historyPage.rows.map((closing) => (
                <Tr key={closing.id}>
                  <Td tone="muted" className="whitespace-nowrap">
                    {stamp(closing.until || closing.closed_at)}
                  </Td>
                  <Td align="right">{money(closing.entradas ?? closing.totais?.total)}</Td>
                  <Td align="right">{closing.saidas == null ? '—' : money(closing.saidas)}</Td>
                  <Td align="right" tone="strong">
                    {money(closing.saldo ?? closing.totais?.total)}
                  </Td>
                  <Td align="right">
                    <Button type="button" size="icon" variant="secondary" onClick={() => setReading(closing)} aria-label="Ver fechamento">
                      <Icon name="visibility" />
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </DataTable>
        <Pagination state={historyPage} />
      </section>
    </div>
  );
}
