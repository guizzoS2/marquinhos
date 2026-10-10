import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { RequiredMark } from '../ui/FieldLabel';
import { formatCents } from '../../services/cashFlowUtils';
import { formatIsoBr, hasStaffAccount, nextPayrollDate, staffAccountLabel } from '@fnl/dashboard/staffPayroll';

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

const fieldClass = 'w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11';

export function HouseStaffDialog({
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
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-on-surface/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-4 md:p-8 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-2xl font-extrabold tracking-tight">
            {person?.name || 'Novo funcionário'}
          </h3>
          <button type="button" className="min-h-11 min-w-11" aria-label="Fechar" title="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={tab === 'info' ? 'primary' : 'secondary'} onClick={() => setTab('info')}>
            Informações
          </Button>
          <Button type="button" variant={tab === 'account' ? 'primary' : 'secondary'} onClick={() => setTab('account')}>
            Conta
          </Button>
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
              <div className="space-y-2">
                <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">Contrato</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'clt', label: 'CLT' },
                    { id: 'pj', label: 'PJ' },
                  ].map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={info.contractType === item.id ? 'primary' : 'secondary'}
                      onClick={() => setInfo((prev) => ({ ...prev, contractType: item.id }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Input label="Custo mensal" name="monthlyCost" inputMode="decimal" value={info.monthlyCost} onChange={(event) => setInfo((prev) => ({ ...prev, monthlyCost: event.target.value }))} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
                    Início
                    <RequiredMark />
                  </span>
                  <input className={fieldClass} type="date" value={info.contractStart} onChange={(event) => setInfo((prev) => ({ ...prev, contractStart: event.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
                    Fim
                    <RequiredMark />
                  </span>
                  <input className={fieldClass} type="date" value={info.contractEnd} onChange={(event) => setInfo((prev) => ({ ...prev, contractEnd: event.target.value }))} required />
                </label>
              </div>
              <p className="text-sm text-on-surface-variant">Pagamento no 5º dia útil do mês.</p>
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div><dt className="text-on-surface-variant">Cargo</dt><dd>{person?.title || '—'}</dd></div>
                <div><dt className="text-on-surface-variant">Contrato</dt><dd>{contractLabel(person?.contractType)}</dd></div>
                <div><dt className="text-on-surface-variant">Custo mensal</dt><dd>{formatCents(person?.monthlyCostCents || 0)}</dd></div>
                <div>
                  <dt className="text-on-surface-variant">Vigência</dt>
                  <dd>{formatIsoBr(person?.contractStart)} – {formatIsoBr(person?.contractEnd)}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Próximo pagamento</dt>
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
              <legend className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">Permissões</legend>
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
            <p className="text-sm text-on-surface-variant">{staffAccountLabel(person)}</p>
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
          <p className="text-sm text-on-surface-variant">Salve o funcionário antes de abrir a conta.</p>
        )}
      </div>
    </div>
  );
}
