import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchInventory, fetchSuppliers, removeSupplier, reversePurchase } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { SuppliersList } from '../components/suppliers/SuppliersList';
import { DataTable, EmptyRow, StatusPill, TableActions, Tag, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { expenseTag } from '../services/catalogTaxonomy';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

function PurchaseCategory({ row }) {
  const tag = expenseTag(row.categoryId || 'compra_estoque', { name: row.categoryName });
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {row.categoryName || 'Compra de estoque'}
    </Tag>
  );
}

function formatPurchaseDate(value) {
  const parsed = parse(String(value || ''), 'yyyy-MM-dd', new Date(0));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SuppliersPage() {
  const [tab, setTab] = useState('entradas');
  const [purchaseQuery, setPurchaseQuery] = useState('');
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  function refreshSuppliers() {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function refreshPurchase() {
    refreshSuppliers();
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  }

  function confirmDelete(supplier) {
    openModal('confirm', {
      message: `Excluir o fornecedor "${supplier.name}"?`,
      confirmLabel: 'Excluir',
      successMessage: 'Fornecedor removido.',
      errorMessage: 'Falha ao excluir fornecedor.',
      onConfirm: async () => {
        await removeSupplier(supplier.id);
        refreshSuppliers();
      },
    });
  }

  function confirmCancel(row) {
    openModal('confirm', {
      message: `Estornar a compra de ${row.supplierName || 'fornecedor'}? O estoque será reduzido e a despesa cancelada.`,
      confirmLabel: 'Cancelar compra',
      successMessage: 'Compra cancelada.',
      errorMessage: 'Não foi possível cancelar a compra.',
      onConfirm: async () => {
        await reversePurchase(row.id);
        refreshPurchase();
      },
    });
  }

  const filteredPurchases = useMemo(() => {
    const purchases = inventory.data?.purchases || [];
    const term = purchaseQuery.trim().toLowerCase();
    if (!term) return purchases;
    return purchases.filter((row) => {
      const products = (row.itens || []).map((item) => `${item.nome} ${item.quantidade}`).join(' ');
      const status = row.status === 'cancelada' ? 'cancelada' : 'ativa';
      return [row.supplierName, row.categoryName, products, formatPurchaseDate(row.date), status, money(row.total)]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [inventory.data, purchaseQuery]);
  const purchasePage = usePagedList(filteredPurchases, purchaseQuery);

  if (inventory.isLoading || !inventory.data) {
    return (
      <div className="p-4 md:p-8 text-on-surface-variant font-body">Carregando compras...</div>
    );
  }

  const suppliers = suppliersQuery.data?.suppliers || [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Quem abastece o bar e as compras já feitas."
      />

      <Tabs
        label="Fornecedores"
        items={[
          { id: 'entradas', label: 'Entradas' },
          { id: 'fornecedores', label: 'Fornecedores' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'entradas' ? (
      <section className="space-y-6">
        <FilterBar
          actions={
            <Button
              onClick={() =>
                openModal('new-purchase', {
                  items: inventory.data?.items || [],
                  suppliers,
                  onSuccess: refreshPurchase,
                })
              }
            >
              <Icon name="add" />
              Nova compra
            </Button>
          }
        >
          <SearchField
            value={purchaseQuery}
            onChange={setPurchaseQuery}
            placeholder="Buscar compra"
            label="Buscar compra"
          />
        </FilterBar>
        <div className="space-y-4">
        <DataTable>
          <THead>
            <Th>Data</Th>
            <Th>Fornecedor</Th>
            <Th>Categoria</Th>
            <Th>Produtos</Th>
            <Th align="right">Valor total</Th>
            <Th>Status</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {(inventory.data?.purchases || []).length === 0 ? (
              <EmptyRow colSpan={7}>Nenhuma compra registrada.</EmptyRow>
            ) : purchasePage.rows.length === 0 ? (
              <EmptyRow colSpan={7}>Nenhuma compra encontrada.</EmptyRow>
            ) : (
              purchasePage.rows.map((row) => {
                const cancelled = row.status === 'cancelada';
                return (
                  <Tr key={row.id}>
                    <Td tone="muted">{formatPurchaseDate(row.date)}</Td>
                    <Td tone="strong">{row.supplierName}</Td>
                    <Td>
                      <PurchaseCategory row={row} />
                    </Td>
                    <Td tone="muted">
                      {(row.itens || []).map((item) => `${item.nome} × ${item.quantidade}`).join(', ') || '—'}
                    </Td>
                    <Td align="right" tone="strong">
                      {money(row.total)}
                    </Td>
                    <Td>
                      <StatusPill tone={cancelled ? 'danger' : 'success'}>
                        <Icon name={cancelled ? 'cancel' : 'check'} className="text-sm" />
                        {cancelled ? 'Cancelada' : 'Ativa'}
                      </StatusPill>
                    </Td>
                    <Td align="right" tone="muted" nowrap>
                      {cancelled ? (
                        '—'
                      ) : (
                        <TableActions>
                          <Button type="button" size="icon" variant="danger" onClick={() => confirmCancel(row)} aria-label="Cancelar compra">
                            <Icon name="cancel" />
                          </Button>
                        </TableActions>
                      )}
                    </Td>
                  </Tr>
                );
              })
            )}
          </TBody>
        </DataTable>
        <Pagination state={purchasePage} />
        </div>
      </section>
      ) : (
        <SuppliersList
          action={
            <Button
              onClick={() =>
                openModal('new-supplier', {
                  onSuccess: refreshSuppliers,
                })
              }
            >
              <Icon name="add" />
              Novo fornecedor
            </Button>
          }
          onOpen={(supplier) =>
            openModal('supplier-detail', {
              supplierId: supplier.id,
              supplier,
            })
          }
          onEdit={(supplier) =>
            openModal('edit-supplier', {
              supplier,
              onSuccess: refreshSuppliers,
            })
          }
          onDelete={confirmDelete}
        />
      )}
    </div>
  );
}
