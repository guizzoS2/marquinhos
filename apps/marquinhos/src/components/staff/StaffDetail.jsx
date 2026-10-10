import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { FieldModal } from '../ui/FieldModal';
import { roleLabel } from '../../services/roles';

function accountLabel(member) {
  if (member?.disabled) return 'Desativada';
  if (member?.accountStatus === 'invited') return 'Convite enviado';
  if (member?.accountStatus === 'pending') return 'Convite pendente';
  if (member?.uid) return 'Ativa';
  return 'Sem conta';
}

export function StaffDetail({ member, onClose, onEdit, onDeactivate, onReactivate, onInvite, onPayments }) {
  const [email, setEmail] = useState(member?.email || '');
  const [accountOpen, setAccountOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(member?.email || '');
    setError('');
    setAccountOpen(false);
  }, [member?.id]);

  if (!member) return null;

  const hasAccount = Boolean(member.uid);
  const inviteSent = member.accountStatus === 'invited' || member.accountStatus === 'pending';

  async function deliverInvite(nextEmail) {
    setSaving(true);
    setError('');
    try {
      await onInvite({ email: nextEmail });
      setAccountOpen(false);
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(event) {
    event.preventDefault();
    await deliverInvite(email);
  }

  return (
    <FieldModal title={member.name} icon="badge" onClose={onClose}>
      <div className="min-w-0">
        <p className="text-sm text-on-surface-variant">{member.title || 'Sem cargo'}</p>
        <p className="text-sm text-on-surface-variant">{accountLabel(member)}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button className="w-full sm:w-auto" onClick={onEdit}>
          <Icon name="edit" />
          Editar
        </Button>
        {member.disabled ? (
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onReactivate}>
            <Icon name="replay" />
            Reativar
          </Button>
        ) : (
          <Button variant="danger" className="w-full sm:w-auto" onClick={onDeactivate}>
            <Icon name="delete" />
            Desativar
          </Button>
        )}
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onPayments}>
          <Icon name="payments" />
          Pagamentos
        </Button>
        {member.disabled ? null : (
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            aria-expanded={accountOpen}
            onClick={() => {
              setError('');
              setAccountOpen((open) => !open);
            }}
          >
            <Icon name="person_add" />
            Criar conta
          </Button>
        )}
      </div>

      <dl className="space-y-3 text-sm">
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

      {accountOpen ? (
        <form className="space-y-4" onSubmit={sendInvite}>
          <p className="text-sm text-on-surface-variant">
            {inviteSent
              ? 'O link do e-mail expira. Reenvie o convite se a pessoa não conseguir criar a senha.'
              : hasAccount
                ? 'Reenvia o e-mail se a pessoa quiser criar outra senha.'
                : 'O e-mail leva um link para criar a senha e entrar no sistema.'}
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
          <Button type="submit" disabled={saving}>
            <Icon name="forward_to_inbox" />
            {saving ? 'Enviando...' : inviteSent || hasAccount ? 'Reenviar convite' : 'Enviar convite'}
          </Button>
        </form>
      ) : null}
    </FieldModal>
  );
}
