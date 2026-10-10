import { Dropdown } from './Dropdown';

export function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <Dropdown
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      className="w-full sm:w-48"
    />
  );
}
