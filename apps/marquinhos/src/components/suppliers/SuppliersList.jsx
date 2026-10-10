import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSuppliers } from '../../services/dashboardService';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { FilterBar } from '../ui/FilterBar';
import { SearchField } from '../ui/SearchField';
import { DataTable, EmptyRow, TableActions, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';

export function SuppliersList({ onEdit, onDelete, onOpen, action = null }) {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const filtered = useMemo(() => {
    const suppliers = data?.suppliers || [];
    const term = query.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contact, supplier.lastPurchase, supplier.lastValue]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [data, query]);
  const page = usePagedList(filtered, query);
  const rows = page.rows;

  if (isLoading) {
    return <p className="text-on-surface-variant">Carregando fornecedores...</p>;
  }

  return (
    <div className="space-y-6">
      <FilterBar
        actions={action}
      >
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar fornecedor"
          label="Buscar fornecedor"
        />
      </FilterBar>
      <div className="space-y-4">
      <DataTable>
        <THead>
          <Th>Nome</Th>
          <Th>Contato</Th>
          <Th>Última compra</Th>
          <Th align="right">Valor</Th>
          <Th align="right">Ações</Th>
        </THead>
        <TBody>
          {(data?.suppliers || []).length === 0 ? (
            <EmptyRow colSpan={5}>Nenhum fornecedor cadastrado.</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={5}>Nenhum fornecedor encontrado.</EmptyRow>
          ) : (
            rows.map((supplier) => (
              <Tr key={supplier.id}>
                <Td tone="strong">{supplier.name}</Td>
                <Td tone="muted">{supplier.contact || '—'}</Td>
                <Td tone="muted">{supplier.lastPurchase || '—'}</Td>
                <Td align="right" tone="strong">
                  {supplier.lastValue || '—'}
                </Td>
                <Td align="right" nowrap>
                  <TableActions>
                    <Button type="button" size="icon" variant="secondary" onClick={() => onOpen?.(supplier)} aria-label={`Ver ${supplier.name}`}>
                      <Icon name="visibility" />
                    </Button>
                    <Button type="button" size="icon" variant="secondary" onClick={() => onEdit?.(supplier)} aria-label={`Editar ${supplier.name}`}>
                      <Icon name="edit" />
                    </Button>
                    <Button type="button" size="icon" variant="danger" onClick={() => onDelete?.(supplier)} aria-label={`Excluir ${supplier.name}`}>
                      <Icon name="delete" />
                    </Button>
                  </TableActions>
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </DataTable>
      <Pagination state={page} />
      </div>
    </div>
  );
}
