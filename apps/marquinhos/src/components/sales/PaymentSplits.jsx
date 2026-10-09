import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { RoleSelect } from '../freelancers/RoleSelect';
import { CARD_INSTALLMENTS, PAYMENT_OPTIONS, parseReaisInput } from '../../services/inventoryProduct';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function blankPayment(forma = 'dinheiro') {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    forma,
    valor: '',
    recebido: '',
    parcelas: '1',
  };
}

export function paymentsFromForm(rows, due, { fillSingle = true } = {}) {
  const list = rows.length ? rows : [blankPayment()];
  return list.map((row) => {
    const blank = String(row.valor || '').trim() === '';
    const valor = blank && list.length === 1 && fillSingle ? due : parseReaisInput(row.valor);
    return {
      forma_pagamento: row.forma,
      valor,
      valor_recebido: row.forma === 'dinheiro' ? parseReaisInput(row.recebido) : null,
      parcelas: row.forma === 'cartao_credito' ? Number(row.parcelas) : null,
    };
  });
}

export function paymentsError(rows, due, { partial = false } = {}) {
  if (due <= 0.001) return '';
  const built = paymentsFromForm(rows, due, { fillSingle: !partial });
  const active = partial ? built.filter((row) => row.valor > 0) : built;
  if (partial) {
    if (built.some((row) => !Number.isFinite(row.valor) || row.valor < 0)) return 'Informe o valor de cada pagamento.';
    if (active.length && built.some((row) => !(row.valor > 0))) return 'Informe o valor de cada pagamento.';
  } else if (built.some((row) => !Number.isFinite(row.valor) || row.valor <= 0)) {
    return 'Informe o valor de cada pagamento.';
  }
  const sum = Math.round(built.reduce((acc, row) => acc + (Number.isFinite(row.valor) ? row.valor : 0), 0) * 100) / 100;
  if (partial) {
    if (sum - due > 0.001) return 'A soma dos pagamentos precisa fechar o saldo.';
  } else if (Math.abs(sum - due) > 0.001) {
    return 'A soma dos pagamentos precisa fechar o saldo.';
  }
  const check = partial ? active : built;
  if (
    check.some(
      (row) =>
        row.forma_pagamento === 'dinheiro' &&
        (!Number.isFinite(row.valor_recebido) || row.valor_recebido < row.valor)
    )
  ) {
    return 'O dinheiro entregue precisa cobrir o pagamento.';
  }
  return '';
}

export function PaymentSplits({ due, payments, onChange, fillSingle = true }) {
  const built = paymentsFromForm(payments, due, { fillSingle });
  const sum = Math.round(built.reduce((acc, row) => acc + (Number.isFinite(row.valor) ? row.valor : 0), 0) * 100) / 100;
  const gap = Math.round((due - sum) * 100) / 100;

  function patch(key, next) {
    onChange(payments.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  function addPayment() {
    const remainder = gap > 0 ? gap.toFixed(2) : '';
    onChange([...payments, { ...blankPayment(), valor: remainder }]);
  }

  return (
    <div className="space-y-3">
      <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Pagamento</p>
      {payments.map((row) => {
        const valor =
          payments.length === 1 && String(row.valor || '').trim() === '' && fillSingle ? due : parseReaisInput(row.valor);
        const recebido = parseReaisInput(row.recebido);
        const troco =
          row.forma === 'dinheiro' && row.recebido !== '' && Number.isFinite(recebido) && Number.isFinite(valor)
            ? Math.round((recebido - valor) * 100) / 100
            : null;
        return (
          <div key={row.key} className="space-y-3 rounded-2xl border border-outline p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <FieldLabel required>Forma</FieldLabel>
                <Dropdown
                  label="Forma de pagamento"
                  muted
                  value={row.forma}
                  onChange={(forma) => patch(row.key, { forma })}
                  options={PAYMENT_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </div>
              {payments.length === 1 && fillSingle ? null : (
                <div className="w-full sm:w-52 sm:shrink-0">
                  <Input
                    label="Valor deste pagamento (R$)"
                    inputMode="decimal"
                    value={row.valor}
                    onChange={(event) => patch(row.key, { valor: event.target.value })}
                    required
                  />
                </div>
              )}
              {payments.length > 1 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  className="shrink-0"
                  aria-label="Remover pagamento"
                  onClick={() => onChange(payments.filter((item) => item.key !== row.key))}
                >
                  <Icon name="delete" />
                </Button>
              ) : null}
            </div>
            {row.forma === 'dinheiro' ? (
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                <Input
                  label="Dinheiro entregue (R$)"
                  inputMode="decimal"
                  value={row.recebido}
                  onChange={(event) => patch(row.key, { recebido: event.target.value })}
                  required
                />
                <div className="space-y-2">
                  <FieldLabel>Troco</FieldLabel>
                  <p
                    className={`flex h-11 items-center rounded-2xl border border-outline bg-surface-container-low px-4 font-headline text-base font-extrabold ${
                      troco != null && troco < 0 ? 'text-error' : 'text-on-surface'
                    }`}
                  >
                    {troco == null ? '—' : money(troco)}
                  </p>
                </div>
              </div>
            ) : null}
            {row.forma === 'cartao_credito' ? (
              <RoleSelect
                id={`parcelas-${row.key}`}
                label="Parcelas"
                options={CARD_INSTALLMENTS.map((item) => ({ value: String(item), label: `${item}x` }))}
                value={row.parcelas}
                onChange={(parcelas) => patch(row.key, { parcelas })}
              />
            ) : null}
          </div>
        );
      })}
      <Button type="button" variant="secondary" onClick={addPayment}>
        <Icon name="add" />
        Adicionar pagamento
      </Button>
      <p className={`text-sm ${gap > 0.001 || gap < -0.001 ? 'text-error' : 'text-on-surface-variant'}`}>
        Soma {money(sum)}
        {gap > 0.001 ? ` · falta ${money(gap)}` : ''}
        {gap < -0.001 ? ` · passa ${money(Math.abs(gap))}` : ''}
      </p>
    </div>
  );
}
