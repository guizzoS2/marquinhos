import { useMemo, useReducer, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Input } from '../ui/Input';
import { FieldLabel } from '../ui/FieldLabel';
import { FieldModal } from '../ui/FieldModal';
import { useToast } from '../../contexts/ToastContext';
import { createDaily } from '../../services/dashboardService';
import {
  SHIFT_STATUSES,
  expandIsoRange,
  peopleByRole,
  toIsoDate,
} from '../../services/freelancerSchedule';
import { Dropdown } from '../ui/Dropdown';
import { NewFreelancerForm } from './NewFreelancerForm';
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
  if (action.type === 'select-person') {
    return { ...state, role: action.role, freelancerId: action.freelancerId };
  }
  if (action.type === 'patch') {
    return { ...state, ...action.patch };
  }
  return state;
}

function mergeById(base, extra) {
  const seen = new Set(base.map((item) => String(item.id)));
  return [...base, ...extra.filter((item) => item?.id != null && !seen.has(String(item.id)))];
}

export function DailyForm({ people = [], roles = [], onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = toIsoDate(new Date());
  const [extraPeople, setExtraPeople] = useState([]);
  const [adding, setAdding] = useState(false);
  const roster = useMemo(() => mergeById(people, extraPeople), [people, extraPeople]);
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

  const options = useMemo(() => peopleByRole(roster, state.role), [roster, state.role]);

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
    <>
    <form className="space-y-5" onSubmit={handleSubmit}>
      <RoleSelect
        id="daily-role"
        label="Função"
        roles={roles}
        value={state.role}
        onChange={(role) => dispatch({ type: 'role', role, people: roster })}
        required
      />

      <div className="space-y-2">
        <FieldLabel id="daily-freelancer-label" required>
          Selecionar Freelancer
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Dropdown
            id="daily-freelancer"
            className="min-w-0 flex-1"
            label="Selecionar Freelancer"
            muted
            leading="person_search"
            disabled={!options.length}
            value={state.freelancerId}
            placeholder={options.length ? 'Selecione um profissional' : 'Nenhum freelancer nesta função'}
            onChange={(freelancerId) => dispatch({ type: 'patch', patch: { freelancerId } })}
            options={options.map((person) => ({ value: person.id, label: person.name }))}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            aria-label="Novo freelancer"
            onClick={() => setAdding(true)}
          >
            <Icon name="add" />
          </Button>
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
          className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1"
        >
          Status
        </label>
        <Dropdown
          id="daily-status"
          label="Status"
          muted
          value={state.status}
          onChange={(status) => dispatch({ type: 'patch', patch: { status } })}
          options={SHIFT_STATUSES.map((item) => ({ value: item.id, label: item.label }))}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          Data do Turno
        </p>
        <SegmentedControl
          className="w-full"
          label="Data do turno"
          items={[
            { id: 'single', label: 'Um dia' },
            { id: 'range', label: 'Período' },
          ]}
          value={state.dateMode}
          onChange={(dateMode) => dispatch({ type: 'patch', patch: { dateMode } })}
        />
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
          <Icon name="check" />
          {saving ? 'Confirmando...' : 'Confirmar agendamento'}
        </Button>
        <p className="text-center text-[11px] text-on-surface-variant mt-4 leading-relaxed">
          Ao confirmar, cada dia entra como despesa variável nas saídas do fluxo de caixa.
        </p>
      </div>
    </form>
      {adding ? (
        <FieldModal title="Novo Freelancer" icon="person_add" onClose={() => setAdding(false)}>
          <NewFreelancerForm
            person={{ role: state.role }}
            roles={roles}
            onCancel={() => setAdding(false)}
            onSuccess={(person) => {
              if (person?.id == null) return;
              setExtraPeople((prev) => mergeById(prev, [person]));
              dispatch({
                type: 'select-person',
                role: person.role || state.role,
                freelancerId: person.id,
              });
              queryClient.invalidateQueries({ queryKey: ['freelancers'] });
            }}
          />
        </FieldModal>
      ) : null}
    </>
  );
}
