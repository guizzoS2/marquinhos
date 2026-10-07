import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FilterBar } from '../ui/FilterBar';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { openComanda } from '../../services/dashboardService';
import { PdvModal } from './PdvModal';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OpenComandas({ sales = [], customers = [] }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { openModal } = useModal();
  const open = sales.filter((sale) => sale.status === 'aberta');
  const page = usePagedList(open, open.map((sale) => sale.id).join('|'));
  const [creating, setCreating] = useState(false);
  const [numero, setNumero] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const clienteOptions = [
    { value: '', label: 'Consumidor' },
    ...customers.map((item) => ({ value: String(item.id), label: item.nome })),
  ];

  async function createComanda(event) {
    event.preventDefault();
    const value = Number(numero);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error('Número da comanda inválido.');
      return;
    }
    setSaving(true);
    try {
      await openComanda({ numero_comanda: value, cliente_id: clienteId || null });
      setNumero('');
      setClienteId('');
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Comanda criada.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível criar a comanda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <FilterBar
        actions={
          creating ? null : (
            <Button type="button" onClick={() => setCreating(true)}>
              <Icon name="add" />
              Nova comanda
            </Button>
          )
        }
      >
        <h3 className="font-headline text-xl font-bold text-on-surface">Comandas abertas</h3>
      </FilterBar>

      {creating ? (
        <form className="space-y-4 rounded-2xl border border-outline bg-surface p-4" onSubmit={createComanda}>
          <Input
            label="Número"
            inputMode="numeric"
            value={numero}
            onChange={(event) => setNumero(event.target.value.replace(/\D/g, ''))}
            required
          />
          <div className="space-y-2">
            <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Cliente</p>
            <Dropdown
              label="Cliente"
              muted
              value={clienteId}
              onChange={setClienteId}
              options={clienteOptions}
              placeholder="Consumidor"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              openModal('new-customer', {
                onSuccess: (customer) => {
                  setClienteId(String(customer.id));
                  queryClient.invalidateQueries({ queryKey: ['customers'] });
                },
              })
            }
          >
            <Icon name="add" />
            Novo cliente
          </Button>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)} disabled={saving}>
              <Icon name="cancel" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Icon name="add" />
              {saving ? 'Salvando...' : 'Criar comanda'}
            </Button>
          </div>
        </form>
      ) : null}

      {open.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          Nenhuma comanda aberta.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {page.rows.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setDetail(sale)}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-outline bg-surface p-3 text-left hover:bg-surface-container-low"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface">
                  <Icon name="receipt_long" className="text-xl" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-on-surface">
                    Comanda {sale.numero_comanda}
                  </span>
                  <span className="block truncate text-sm text-on-surface-variant">
                    {sale.cliente_nome || 'Consumidor'}
                  </span>
                </span>
                <span className="shrink-0 font-headline font-extrabold text-on-surface">{money(sale.total)}</span>
              </button>
            ))}
          </div>
          <Pagination state={page} />
        </div>
      )}

      {detail ? (
        <PdvModal
          title={`Comanda ${detail.numero_comanda}`}
          icon="receipt_long"
          onClose={() => setDetail(null)}
        >
          <p className="text-sm text-on-surface-variant">Cliente {detail.cliente_nome || 'Consumidor'}</p>
          {(detail.itens || []).length === 0 ? (
            <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
              Nenhum item nesta comanda.
            </p>
          ) : (
            <ul className="space-y-3">
              {detail.itens.map((item, index) => (
                <li
                  key={`${item.produto_id}-${index}`}
                  className="rounded-2xl border border-outline bg-surface p-3"
                >
                  <p className="break-words font-semibold text-on-surface">{item.nome}</p>
                  <p className="text-sm text-on-surface-variant">
                    {item.quantidade} × {money(item.valor_unitario)}
                  </p>
                  <p className="font-headline font-extrabold text-on-surface">{money(item.valor_total)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="font-headline text-xl font-extrabold text-on-surface">Total {money(detail.total)}</p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setDetail(null)}>
              <Icon name="close" />
              Fechar
            </Button>
          </div>
        </PdvModal>
      ) : null}
    </section>
  );
}
