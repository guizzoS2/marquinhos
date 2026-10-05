import { useMemo, useReducer } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';
import { editDaily } from '../../services/dashboardService';
import { SHIFT_STATUSES, peopleByRole } from '../../services/freelancerSchedule';
import { RoleSelect } from './RoleSelect';

function shiftReducer(state, action) {
  if (action.type === 'role') {
    const allowed = new Set(peopleByRole(action.people, action.role).map((person) => String(person.id)));
    return {
      ...state,
      role: action.role,
      freelancerId: allowed.has(String(state.freelancerId)) ? state.freelancerId : '',
    };
  }
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export function ShiftDetailForm({ shift, people = [], roles = [], onSuccess, onCancel }) {
  const toast = useToast();
  const roleOptions =
    shift?.role && !roles.includes(shift.role) ? [shift.role, ...roles] : roles;
  const [state, dispatch] = useReducer(shiftReducer, {
    role: shift?.role || roleOptions[0] || 'Barman',
    freelancerId: shift?.freelancerId != null ? String(shift.freelancerId) : '',
    value: shift?.value != null ? String(shift.value) : '',
    status: shift?.status || 'pending_payment',
    date: shift?.date || '',
  });
  const [saving, setSaving] = useReducer((_, next) => next, false);
  const [error, setError] = useReducer((_, next) => next, '');
  const options = useMemo(() => peopleByRole(people, state.role), [people, state.role]);
  const person = people.find((item) => String(item.id) === String(state.freelancerId));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!state.freelancerId) {
      setError('Selecione um freelancer desta função.');
      return;
    }
    const amount = Number(state.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe o valor da diária.');
      return;
    }
    if (!state.date) {
      setError('Informe a data do turno.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await editDaily(shift, {
        freelancerId: state.freelancerId,
        date: state.date,
        role: state.role,
        value: amount,
        status: state.status,
      });
      toast.success('Diária atualizada.');
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível alterar a diária.');
      toast.error('Falha ao alterar a diária.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {person ? (
        <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-4">
          <img src={person.image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
          <div className="min-w-0">
            <p className="font-headline font-bold text-on-surface truncate">{person.name}</p>
            <p className="text-sm text-on-surface-variant">{person.role}</p>
            <p className="text-sm text-on-surface-variant">{person.contact || 'Sem contato'}</p>
          </div>
        </div>
      ) : null}

      <RoleSelect
        id="shift-role"
        label="Função"
        roles={roleOptions}
        value={state.role}
        onChange={(role) => dispatch({ type: 'role', role, people })}
        required
      />

      <div className="space-y-2">
        <label
          htmlFor="shift-freelancer"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Selecionar Freelancer
        </label>
        <div className="relative">
          <select
            id="shift-freelancer"
            className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
            value={state.freelancerId}
            onChange={(event) => dispatch({ type: 'patch', patch: { freelancerId: event.target.value } })}
            required
          >
            <option value="">
              {options.length ? 'Selecione um profissional' : 'Nenhum freelancer nesta função'}
            </option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Icon
            name="person_search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
        </div>
      </div>

      <Input
        label="Valor da diária (R$)"
        name="shift-value"
        type="number"
        min="0.01"
        step="0.01"
        value={state.value}
        onChange={(event) => dispatch({ type: 'patch', patch: { value: event.target.value } })}
        required
      />

      <div className="space-y-2">
        <label
          htmlFor="shift-status"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="shift-status"
            className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-4 pr-10 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
            value={state.status}
            onChange={(event) => dispatch({ type: 'patch', patch: { status: event.target.value } })}
          >
            {SHIFT_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none"
          />
        </div>
      </div>

      <Input
        label="Data do Turno"
        name="shift-date"
        type="date"
        value={state.date}
        onChange={(event) => dispatch({ type: 'patch', patch: { date: event.target.value } })}
        required
      />

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar diária'}
        </Button>
        <p className="text-center text-[11px] text-on-surface-variant mt-4 leading-relaxed">
          A alteração atualiza esta diária e a saída correspondente no fluxo de caixa.
        </p>
      </div>
    </form>
  );
}
