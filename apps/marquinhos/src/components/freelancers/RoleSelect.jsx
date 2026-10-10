import { Dropdown } from '../ui/Dropdown';
import { RequiredMark } from '../ui/FieldLabel';

export function RoleSelect({
  id,
  label = 'Função',
  roles,
  options,
  value,
  onChange,
  required = false,
}) {
  const choices = options || (roles || []).map((role) => ({ value: role, label: role }));

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      <Dropdown id={id} label={label} muted value={value} onChange={onChange} options={choices} />
    </div>
  );
}
