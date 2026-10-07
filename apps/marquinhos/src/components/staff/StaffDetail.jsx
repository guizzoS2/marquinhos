import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { Tabs } from '../ui/Tabs';
import { roleLabel } from '../../services/roles';

function accountLabel(member) {
  if (member?.disabled) return 'Desativada';
  if (member?.accountStatus === 'invited') return 'Convite enviado';
  if (member?.accountStatus === 'pending') return 'Convite pendente';
  if (member?.uid) return 'Ativa';
  return 'Sem conta';
}

export function StaffDetail({ member, onClose, onEdit, onDeactivate, onReactivate, onInvite }) {
  const [tab, setTab] = useState('info');
  const [email, setEmail] = useState(member?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(member?.email || '');
    setError('');
    setTab('info');
  }, [member?.id]);

  if (!member) return null;

  const hasAccount = Boolean(member.uid);

  async function sendInvite(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onInvite({ email });
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar perfil"
        className="fixed inset-0 bg-on-surface/40 z-[60]"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-[60] h-dvh w-full max-w-md bg-surface-container-lowest border-l border-outline-variant p-4 md:p-8 overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">Equipe da casa</h3>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </Button>
        </div>

        <div className="mb-6 min-w-0">
          <p className="font-headline font-bold text-lg text-on-surface truncate">{member.name}</p>
          <p className="text-sm text-on-surface-variant">{member.title || 'Sem cargo'}</p>
          <p className="text-sm text-on-surface-variant">{accountLabel(member)}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button className="w-full sm:w-auto" onClick={onEdit}>
            <Icon name="edit" />
            Editar
          </Button>
          {member.disabled ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={onReactivate}>
              Reativar
            </Button>
          ) : (
            <Button variant="danger" className="w-full sm:w-auto" onClick={onDeactivate}>
              <Icon name="delete" />
              Desativar
            </Button>
          )}
        </div>

        <Tabs
          label="Funcionário"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'info', label: 'Informações' },
            { id: 'account', label: 'Conta' },
          ]}
        />

        {tab === 'info' ? (
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-on-surface-variant">Cargo</dt>
              <dd className="font-semibold text-on-surface">{member.title || '—'}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Papel</dt>
              <dd className="font-semibold text-on-surface">{roleLabel(member.role)}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Conta</dt>
              <dd className="font-semibold text-on-surface">{accountLabel(member)}</dd>
            </div>
          </dl>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={sendInvite}>
            <p className="text-sm text-on-surface-variant">
              O funcionário pode existir sem login. O e-mail leva um link para criar a senha e entrar no sistema.
            </p>
            <Input
              label="E-mail"
              name="email"
              type="email"
              value={email}
              disabled={hasAccount || member.disabled}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {error ? <p className="text-sm text-error">{error}</p> : null}
            {member.disabled ? (
              <p className="text-sm text-on-surface-variant">Reative a pessoa para enviar o acesso.</p>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? 'Enviando...' : hasAccount ? 'Reenviar link' : 'Enviar link'}
              </Button>
            )}
          </form>
        )}
      </aside>
    </>
  );
}
