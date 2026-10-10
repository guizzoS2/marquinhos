import { useEffect, useState } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Input } from './Input';
import { formatCents } from '../../services/cashFlowUtils';
import { formatIsoBr, hasStaffAccount, nextPayrollDate, staffAccountLabel } from '../../services/staffPayroll';

function centsField(cents) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return '';
  return (amount / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function contractLabel(type) {
  if (type === 'pj') return 'PJ';
  if (type === 'clt') return 'CLT';
  return '—';
}

export function StaffDialog({
  person,
  mode,
  canManage,
  permissions,
  onClose,
  onSaveInfo,
  onInvite,
  onSaveAccess,
  onDelete,
}) {
  const [tab, setTab] = useState('info');
  const [editing, setEditing] = useState(mode !== 'view');
  const [info, setInfo] = useState({
    name: person?.name || '',
    title: person?.title || '',
    contractType: person?.contractType || '',
    monthlyCost: centsField(person?.monthlyCostCents),
    contractStart: person?.contractStart || '',
    contractEnd: person?.contractEnd || '',
  });
  const [account, setAccount] = useState({
    email: person?.email || '',
    permissions: person?.permissions || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInfo({
      name: person?.name || '',
      title: person?.title || '',
      contractType: person?.contractType || '',
      monthlyCost: centsField(person?.monthlyCostCents),
      contractStart: person?.contractStart || '',
      contractEnd: person?.contractEnd || '',
    });
    setAccount({
      email: hasStaffAccount(person) ? person?.email || '' : '',
      permissions: hasStaffAccount(person) ? person?.permissions || [] : [],
    });
    setEditing(mode !== 'view');
    setError('');
  }, [person, mode]);

  function togglePermission(id) {
    setAccount((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter((item) => item !== id)
        : [...prev.permissions, id],
    }));
  }

  async function run(task) {
    setSaving(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  const lockedEmail = Boolean(person?.uid);

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center p-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--paper,#f4efe6)] text-[var(--ink,#111)] border-2 border-[var(--ink,#111)] p-4 md:p-8 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-3xl uppercase tracking-wide">
            {person?.name || 'Novo funcionário'}
          </h3>
          <button type="button" className="min-h-11 min-w-11" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'info' ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
            onClick={() => setTab('info')}
          >
            Informações
          </button>
          <button
            type="button"
            className={tab === 'account' ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
            onClick={() => setTab('account')}
          >
            Conta
          </button>
        </div>

        {tab === 'info' ? (
          editing ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                run(() => onSaveInfo(info));
              }}
            >
              <Input label="Nome" name="name" value={info.name} onChange={(event) => setInfo((prev) => ({ ...prev, name: event.target.value }))} required />
              <Input label="Cargo" name="title" value={info.title} onChange={(event) => setInfo((prev) => ({ ...prev, title: event.target.value }))} required />
              <fieldset className="space-y-2">
                <legend className="font-display text-sm tracking-widest uppercase text-[var(--muted,#5c5c5c)]">Contrato</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'clt', label: 'CLT' },
                    { id: 'pj', label: 'PJ' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={info.contractType === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
                      onClick={() => setInfo((prev) => ({ ...prev, contractType: item.id }))}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Input label="Custo mensal" name="monthlyCost" inputMode="decimal" value={info.monthlyCost} onChange={(event) => setInfo((prev) => ({ ...prev, monthlyCost: event.target.value }))} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Início" name="contractStart" type="date" value={info.contractStart} onChange={(event) => setInfo((prev) => ({ ...prev, contractStart: event.target.value }))} required />
                <Input label="Fim" name="contractEnd" type="date" value={info.contractEnd} onChange={(event) => setInfo((prev) => ({ ...prev, contractEnd: event.target.value }))} required />
              </div>
              <p className="text-sm text-[var(--muted,#5c5c5c)]">Pagamento no 5º dia útil do mês.</p>
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div><dt className="text-[var(--muted,#5c5c5c)]">Cargo</dt><dd>{person?.title || '—'}</dd></div>
                <div><dt className="text-[var(--muted,#5c5c5c)]">Contrato</dt><dd>{contractLabel(person?.contractType)}</dd></div>
                <div><dt className="text-[var(--muted,#5c5c5c)]">Custo mensal</dt><dd>{formatCents(person?.monthlyCostCents || 0)}</dd></div>
                <div>
                  <dt className="text-[var(--muted,#5c5c5c)]">Vigência</dt>
                  <dd>{formatIsoBr(person?.contractStart)} – {formatIsoBr(person?.contractEnd)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted,#5c5c5c)]">Próximo pagamento</dt>
                  <dd>{formatIsoBr(nextPayrollDate(person))}</dd>
                </div>
              </dl>
              {canManage ? (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="danger" type="button" onClick={onDelete}>Excluir</Button>
                  <Button type="button" onClick={() => setEditing(true)}>Editar</Button>
                </div>
              ) : null}
            </div>
          )
        ) : person?.id ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canManage) return;
              run(() => (person.uid ? onSaveAccess(account) : onInvite(account)));
            }}
          >
            <Input
              label="E-mail"
              name="email"
              type="email"
              value={account.email}
              disabled={lockedEmail || !canManage}
              onChange={(event) => setAccount((prev) => ({ ...prev, email: event.target.value }))}
            />
            <fieldset className="space-y-2">
              <legend className="font-display text-sm tracking-widest uppercase text-[var(--muted,#5c5c5c)]">Permissões</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {permissions.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 min-h-11">
                    <input
                      type="checkbox"
                      disabled={!canManage}
                      checked={account.permissions.includes(item.id)}
                      onChange={() => togglePermission(item.id)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-[var(--muted,#5c5c5c)]">{staffAccountLabel(person)}</p>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            {canManage ? (
              <div className="flex flex-wrap gap-2 justify-end">
                {person.uid ? (
                  <Button variant="secondary" type="button" disabled={saving} onClick={() => run(() => onInvite(account))}>
                    Reenviar convite
                  </Button>
                ) : null}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : person.uid ? 'Salvar permissões' : 'Enviar convite'}
                </Button>
              </div>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-[var(--muted,#5c5c5c)]">Salve o funcionário antes de abrir a conta.</p>
        )}
      </div>
    </div>
  );
}
