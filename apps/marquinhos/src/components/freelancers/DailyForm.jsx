import { useMemo, useReducer } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';
import { createDaily } from '../../services/dashboardService';
import {
  SHIFT_STATUSES,
  expandIsoRange,
  peopleByRole,
  toIsoDate,
} from '../../services/freelancerSchedule';
import { RoleSelect } from './RoleSelect';

function dailyReducer(state, action) {
  if (action.type === 'role') {
    const allowed = new Set(peopleByRole(action.people, action.role).map((person) => String(person.id)));
    return {
      ...state,
      role: action.role,
      freelancerId: allowed.has(String(state.freelancerId)) ? state.freelancerId : '',
    };
  }
  if (action.type === 'patch') {
    return { ...state, ...action.patch };
  }
  return state;
}

export function DailyForm({ people = [], roles = [], onSuccess, onCancel }) {
  const toast = useToast();
  const today = toIsoDate(new Date());
  const [state, dispatch] = useReducer(dailyReducer, {
    role: roles[0] || 'Barman',
    freelancerId: '',
    value: '',
    status: 'pending_payment',
    dateMode: 'single',
    date: today,
    endDate: today,
  });
  const [saving, setSaving] = useReducer((_, next) => next, false);
  const [error, setError] = useReducer((_, next) => next, '');

  const options = useMemo(() => peopleByRole(people, state.role), [people, state.role]);

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

    let dates;
    try {
      dates = expandIsoRange(state.date, state.dateMode === 'range' ? state.endDate : state.date);
    } catch (err) {
      setError(err.message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      for (const date of dates) {
        await createDaily({
          freelancerId: state.freelancerId,
          date,
          role: state.role,
          value: amount,
          status: state.status,
        });
      }
      toast.success(
        dates.length > 1
          ? `${dates.length} diárias lançadas nas saídas.`
          : 'Diária registrada e despesa lançada.'
      );
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível registrar a diária.');
      toast.error('Falha ao registrar diária.');
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <RoleSelect
        id="daily-role"
        label="Função"
        roles={roles}
        value={state.role}
        onChange={(role) => dispatch({ type: 'role', role, people })}
        required
      />

      <div className="space-y-2">
        <label
          htmlFor="daily-freelancer"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Selecionar Freelancer
        </label>
        <div className="relative">
          <select
            id="daily-freelancer"
            className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
            value={state.freelancerId}
            onChange={(event) => dispatch({ type: 'patch', patch: { freelancerId: event.target.value } })}
            required
            disabled={!options.length}
          >
            <option value="">
              {options.length ? 'Selecione um profissional' : 'Nenhum freelancer nesta função'}
            </option>
            {options.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
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
        name="daily-value"
        type="number"
        min="0.01"
        step="0.01"
        value={state.value}
        onChange={(event) => dispatch({ type: 'patch', patch: { value: event.target.value } })}
        required
      />

      <div className="space-y-2">
        <label
          htmlFor="daily-status"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="daily-status"
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

      <div className="space-y-2">
        <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Data do Turno
        </p>
        <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl">
          <button
            type="button"
            onClick={() => dispatch({ type: 'patch', patch: { dateMode: 'single' } })}
            className={
              state.dateMode === 'single'
                ? 'flex-1 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                : 'flex-1 min-h-11 rounded-xl text-on-surface-variant'
            }
          >
            Um dia
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'patch', patch: { dateMode: 'range' } })}
            className={
              state.dateMode === 'range'
                ? 'flex-1 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                : 'flex-1 min-h-11 rounded-xl text-on-surface-variant'
            }
          >
            Período
          </button>
        </div>
      </div>

      <div className={state.dateMode === 'range' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
        <Input
          label={state.dateMode === 'range' ? 'Início' : 'Data'}
          name="daily-date"
          type="date"
          value={state.date}
          onChange={(event) => dispatch({ type: 'patch', patch: { date: event.target.value } })}
          required
        />
        {state.dateMode === 'range' ? (
          <Input
            label="Fim"
            name="daily-end"
            type="date"
            value={state.endDate}
            min={state.date}
            onChange={(event) => dispatch({ type: 'patch', patch: { endDate: event.target.value } })}
            required
          />
        ) : null}
      </div>

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={saving || !options.length}>
          {saving ? 'Confirmando...' : 'Confirmar Agendamento'}
        </Button>
        <p className="text-center text-[11px] text-on-surface-variant mt-4 leading-relaxed">
          Ao confirmar, cada dia entra como despesa variável nas saídas do fluxo de caixa.
        </p>
      </div>
    </form>
  );
}
