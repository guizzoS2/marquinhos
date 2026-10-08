import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StatusPill } from '../ui/DataTable';
import { natureLabel } from '../../services/cashFlowUtils';
import { payLabel, movementCycle } from '../../services/movementLink';
import { saleBalance, salePaidAmount } from '../../services/saleRules';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-label font-bold uppercase text-on-surface-variant">{label}</p>
      <p className="break-words font-medium text-on-surface">{value || '—'}</p>
    </div>
  );
}

function ProductLines({ itens }) {
  if (!itens?.length) {
    return <p className="text-on-surface-variant">Nenhum produto.</p>;
  }
  return (
    <ul className="space-y-3">
      {itens.map((item, index) => (
        <li
          key={`${item.produto_id || item.nome}-${index}`}
          className="rounded-2xl border border-outline bg-surface p-3"
        >
          <p className="break-words font-semibold text-on-surface">{item.nome || 'Produto'}</p>
          <p className="text-sm text-on-surface-variant">
            {item.quantidade} × {money(item.valor_unitario)}
          </p>
          <p className="font-headline font-extrabold text-on-surface">{money(item.valor_total)}</p>
        </li>
      ))}
    </ul>
  );
}

function saleStatusLabel(sale) {
  if (sale.status === 'paga') return 'Paga';
  if (sale.status === 'cancelada') return 'Cancelada';
  if (saleBalance(sale) <= 0 && (sale.historico || []).length) return 'Quitada';
  return 'Aberta';
}

function PaymentFields({ payment }) {
  if (!payment) return null;
  return (
    <>
      <Field label="Pagamento" value={payLabel(payment.forma_pagamento) || '—'} />
      <Field label="Valor pago" value={money(payment.valor)} />
      {payment.forma_pagamento === 'dinheiro' ? (
        <>
          <Field label="Recebido" value={money(payment.valor_recebido)} />
          <Field label="Troco" value={money(payment.troco)} />
        </>
      ) : null}
      {payment.forma_pagamento === 'cartao_credito' && Number(payment.parcelas) > 1 ? (
        <Field label="Parcelas" value={`${payment.parcelas}x`} />
      ) : null}
    </>
  );
}

function SaleSpecs({ movement, sale }) {
  const cycle = movementCycle(sale, movement);
  const itens = cycle?.itens || [];
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Data" value={movement?.data_hora} />
        <Field label="Cliente" value={sale.cliente_nome || movement?.entidade || 'Consumidor'} />
        {sale.numero_comanda ? <Field label="Comanda" value={String(sale.numero_comanda)} /> : null}
        <div className="space-y-1">
          <p className="text-xs font-label font-bold uppercase text-on-surface-variant">Status</p>
          <StatusPill tone={sale.status === 'cancelada' ? 'neutral' : 'accent'}>{saleStatusLabel(sale)}</StatusPill>
        </div>
        <Field label="Valor desta entrada" value={movement?.valor} />
        <PaymentFields payment={cycle?.pagamento} />
      </div>
      {sale.observacao ? <Field label="Observação" value={sale.observacao} /> : null}
      <div className="space-y-3">
        <h4 className="font-headline font-bold text-on-surface">
          {cycle?.past ? 'Produtos do período' : 'Produtos'}
        </h4>
        <ProductLines itens={itens} />
      </div>
      {cycle?.past ? <Field label="Total do período" value={money(cycle.total)} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Total" value={money(sale.total)} />
        <Field label="Pago" value={money(salePaidAmount(sale))} />
        <Field label="Saldo" value={money(saleBalance(sale))} />
      </div>
    </>
  );
}

function PurchaseSpecs({ movement, purchase }) {
  const fornecedor = purchase?.supplierName || movement?.entidade || movement?.supplier || movement?.descricao;
  const categoria = purchase?.categoryName || movement?.categoria;
  const valor = movement?.valor || (purchase ? money(purchase.total) : '');
  const itens = purchase?.itens || [];
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Data" value={movement?.data_hora} />
        <Field label="Fornecedor" value={fornecedor} />
        <Field label="Categoria" value={categoria} />
        <Field label="Natureza" value={movement?.nature ? natureLabel(movement.nature) : '—'} />
        <Field label="Valor" value={valor} />
        {purchase ? (
          <div className="space-y-1">
            <p className="text-xs font-label font-bold uppercase text-on-surface-variant">Status</p>
            <StatusPill tone={purchase.status === 'cancelada' ? 'neutral' : 'accent'}>
              {purchase.status === 'cancelada' ? 'Cancelada' : 'Ativa'}
            </StatusPill>
          </div>
        ) : null}
      </div>
      {itens.length ? (
        <div className="space-y-3">
          <h4 className="font-headline font-bold text-on-surface">Produtos</h4>
          <ProductLines itens={itens} />
        </div>
      ) : null}
    </>
  );
}

function MovementSpecs({ movement }) {
  const saida = movement?.tipo === 'saida';
  const descricao = movement?.descricao && movement.descricao !== '—' ? movement.descricao : '';
  const origem = movement?.entidade || movement?.supplier || '';
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Data" value={movement?.data_hora} />
      <Field label="Tipo" value={saida ? 'Saída' : 'Entrada'} />
      {descricao ? <Field label="Descrição" value={descricao} /> : null}
      {origem && origem !== descricao ? <Field label={saida ? 'Fornecedor' : 'Origem'} value={origem} /> : null}
      <Field label="Categoria" value={movement?.categoria} />
      {saida ? <Field label="Natureza" value={movement?.nature ? natureLabel(movement.nature) : '—'} /> : null}
      <Field label="Valor" value={movement?.valor} />
    </div>
  );
}

export function MovementDetail({ movement = null, sale = null, purchase = null, onCancel }) {
  return (
    <div className="space-y-6">
      {sale ? <SaleSpecs movement={movement} sale={sale} /> : null}
      {!sale && (purchase || movement?.tipo === 'saida') ? (
        <PurchaseSpecs movement={movement} purchase={purchase} />
      ) : null}
      {!sale && !purchase && movement?.tipo !== 'saida' ? <MovementSpecs movement={movement} /> : null}
      <div className="flex justify-end">
        <Button type="button" onClick={onCancel}>
          <Icon name="close" />
          Fechar
        </Button>
      </div>
    </div>
  );
}
