import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { FieldModal } from '../ui/FieldModal';
import { FilterBar } from '../ui/FilterBar';
import { Icon } from '../ui/Icon';
import { SearchField } from '../ui/SearchField';
import { useModal } from '../../contexts/ModalContext';
import { fetchCustomers, fetchInventory } from '../../services/dashboardService';
import { formatSaleStamp, saleBalance, salePaidAmount } from '../../services/saleRules';
import { CustomerForm } from './CustomerForm';

function plain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function salesOf(customer, sales) {
  const name = plain(customer?.nome);
  return (sales || [])
    .filter((sale) => {
      if (sale?.cliente_id && String(sale.cliente_id) === String(customer.id)) return true;
      const saleName = plain(sale?.cliente_nome);
      return Boolean(name) && name !== 'consumidor' && saleName === name;
    })
    .sort((left, right) =>
      String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''))
    );
}

function statusText(sale) {
  if (sale?.status === 'paga') return 'Fechada';
  if (sale?.status === 'cancelada') return 'Cancelada';
  if (sale?.numero_comanda && salePaidAmount(sale) > 0 && saleBalance(sale) > 0) return 'Parcial';
  if (sale?.numero_comanda) return 'Aberta';
  return 'Venda';
}

export function ClientsPanel() {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState(null);
  const customers = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (customers.data?.customers || []).filter((customer) => {
      if (!term) return true;
      return [customer.nome, customer.contato].join(' ').toLowerCase().includes(term);
    });
  }, [customers.data, query]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  const history = panel?.kind === 'history' ? salesOf(panel.customer, inventory.data?.sales) : [];

  return (
    <div className="space-y-4">
      <FilterBar
        actions={
          <Button type="button" onClick={() => openModal('new-customer', { onSuccess: refresh })}>
            <Icon name="add" />
            Novo cliente
          </Button>
        }
      >
        <SearchField value={query} onChange={setQuery} placeholder="Buscar cliente" label="Buscar cliente" />
      </FilterBar>
      <DataTable>
        <THead>
          <Th>Cliente</Th>
          <Th>Contato</Th>
          <Th align="right">Comandas</Th>
          <Th align="right">Ações</Th>
        </THead>
        <TBody>
          {customers.isLoading ? (
            <EmptyRow colSpan={4}>Carregando clientes...</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={4}>{query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente.'}</EmptyRow>
          ) : (
            rows.map((customer) => {
              const count = salesOf(customer, inventory.data?.sales).length;
              return (
                <Tr key={customer.id} onClick={() => setPanel({ kind: 'history', customer })}>
                  <Td tone="strong">{customer.nome}</Td>
                  <Td>{customer.contato || '—'}</Td>
                  <Td align="right">{count}</Td>
                  <Td align="right" nowrap>
                    <TableActions>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label={`Editar ${customer.nome}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPanel({ kind: 'edit', customer });
                        }}
                      >
                        <Icon name="edit" />
                      </Button>
                    </TableActions>
                  </Td>
                </Tr>
              );
            })
          )}
        </TBody>
      </DataTable>
      {panel?.kind === 'edit' ? (
        <FieldModal title="Editar cliente" icon="edit" onClose={() => setPanel(null)}>
          <CustomerForm
            customer={panel.customer}
            onCancel={() => setPanel(null)}
            onSuccess={() => {
              refresh();
              setPanel(null);
            }}
          />
        </FieldModal>
      ) : null}
      {panel?.kind === 'history' ? (
        <FieldModal wide title={panel.customer.nome} icon="person" onClose={() => setPanel(null)}>
          <p className="text-sm text-on-surface-variant">{panel.customer.contato || 'Sem contato'}</p>
          {history.length ? (
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Comanda</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </THead>
              <TBody>
                {history.map((sale) => {
                  const stamp = formatSaleStamp(sale.updated_at || sale.created_at);
                  const label = statusText(sale);
                  const tone = label === 'Cancelada' ? 'danger' : label === 'Fechada' ? 'success' : label === 'Parcial' ? 'ink' : 'accent';
                  const icon = label === 'Cancelada' ? 'cancel' : label === 'Fechada' ? 'check' : label === 'Parcial' ? 'pie_chart' : 'receipt_long';
                  return (
                    <Tr key={sale.id}>
                      <Td tone="muted" className="whitespace-nowrap">
                        {stamp.data} {stamp.hora}
                      </Td>
                      <Td>{sale.numero_comanda ? `Comanda ${sale.numero_comanda}` : 'Venda'}</Td>
                      <Td>
                        <StatusPill tone={tone}>
                          <Icon name={icon} className="text-sm" />
                          {label}
                        </StatusPill>
                      </Td>
                      <Td align="right" tone="strong">
                        {money(sale.total)}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </DataTable>
          ) : (
            <p className="text-sm text-on-surface-variant">Nenhuma compra deste cliente.</p>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setPanel({ kind: 'edit', customer: panel.customer })}>
              <Icon name="edit" />
              Editar
            </Button>
          </div>
        </FieldModal>
      ) : null}
    </div>
  );
}
