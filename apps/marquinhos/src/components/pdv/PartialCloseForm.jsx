import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useToast } from '../../contexts/ToastContext';
import { partialCloseComanda } from '../../services/dashboardService';
import { CARD_INSTALLMENTS, PAYMENT_OPTIONS, parseReaisInput } from '../../services/inventoryProduct';
import { saleBalance } from '../../services/saleRules';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAYMENT_ICONS = {
  dinheiro: 'payments',
  cartao_credito: 'credit_card',
  cartao_debito: 'contactless',
  pix: 'qr_code_2',
};

export function PartialCloseForm({ sale, onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const saldo = saleBalance(sale);
  const [modo, setModo] = useState('parcial');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [recebido, setRecebido] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amount = modo === 'completo' ? saldo : parseReaisInput(valor);
  const received = parseReaisInput(recebido);
  const troco =
    forma === 'dinheiro' && valor !== '' && Number.isFinite(received)
      ? Math.round((received - amount) * 100) / 100
      : null;

  async function send(destino) {
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe o valor do pagamento.');
      return;
    }
    if (destino === 'parcial' && saldo - amount <= 0.001) {
      setError('Para quitar, escolha completo.');
      return;
    }
    if (amount - saldo > 0.001) {
      setError('O valor passa do saldo.');
      return;
    }
    if (forma === 'dinheiro' && (troco == null || troco < 0)) {
      setError('Informe um valor recebido que cubra o pagamento.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const next = await partialCloseComanda({
        sale_id: sale.id,
        valor: amount,
        forma_pagamento: forma,
        valor_recebido: forma === 'dinheiro' ? received : null,
        parcelas: forma === 'cartao_credito' ? Number(parcelas) : null,
        destino,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
      toast.success(destino === 'fechar' ? 'Comanda fechada.' : 'Pagamento parcial registrado.');
      onSuccess?.(next);
    } catch (err) {
      const message = err?.message || 'Não foi possível registrar o pagamento.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        send(modo === 'completo' ? 'fechar' : 'parcial');
      }}
    >
      <SegmentedControl
        className="w-full"
        label="Tipo de fechamento"
        items={[
          { id: 'parcial', label: 'Parcial' },
          { id: 'completo', label: 'Completo' },
        ]}
        value={modo}
        onChange={setModo}
      />
      <p className="text-sm text-on-surface-variant">
        {modo === 'completo'
          ? `Saldo ${money(saldo)}. O pagamento quita e fecha a comanda.`
          : `Saldo ${money(saldo)}. A comanda continua aberta com o restante.`}
      </p>
      {modo === 'completo' ? (
        <div className="space-y-1">
          <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Valor deste pagamento</p>
          <p className="font-headline text-xl font-extrabold text-on-surface">{money(saldo)}</p>
        </div>
      ) : (
        <Input
          label="Valor deste pagamento (R$)"
          inputMode="decimal"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          required
        />
      )}
      <div className="space-y-2">
        <p id="parcial-pagamento" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Forma de pagamento
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-labelledby="parcial-pagamento">
          {PAYMENT_OPTIONS.map((option) => {
            const selected = forma === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setForma(option.value)}
                className={`inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-full px-4 text-left text-sm font-semibold leading-5 [&_.material-symbols-outlined]:text-xl ${
                  selected
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline bg-surface text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <Icon name={PAYMENT_ICONS[option.value] || 'payments'} className="shrink-0" />
                <span className="min-w-0">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {forma === 'dinheiro' ? (
        <div className="grid grid-cols-1 gap-3">
          <Input
            label="Valor recebido (R$)"
            inputMode="decimal"
            value={recebido}
            onChange={(event) => setRecebido(event.target.value)}
            required
          />
          <div className="space-y-2">
            <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Troco</p>
            <p
              className={`flex min-h-11 items-center font-headline text-xl font-extrabold ${troco != null && troco < 0 ? 'text-error' : 'text-on-surface'}`}
            >
              {troco == null ? '—' : money(troco)}
            </p>
          </div>
        </div>
      ) : null}
      {forma === 'cartao_credito' ? (
        <RoleSelect
          id="parcial-parcelas"
          label="Parcelas"
          options={CARD_INSTALLMENTS.map((item) => ({ value: String(item), label: `${item}x` }))}
          value={parcelas}
          onChange={setParcelas}
        />
      ) : null}
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || saldo <= 0}>
          <Icon name={modo === 'completo' ? 'lock' : 'payments'} />
          {saving ? 'Salvando...' : modo === 'completo' ? 'Fechar comanda' : 'Registrar pagamento'}
        </Button>
      </div>
    </form>
  );
}
