import { Icon } from '../ui/Icon';

export function RoleSelect({ id, label = 'Função', roles, value, onChange, required = false }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-4 pr-10 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none"
        />
      </div>
    </div>
  );
}
