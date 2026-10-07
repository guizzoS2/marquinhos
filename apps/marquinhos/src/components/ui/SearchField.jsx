import { Icon } from './Icon';

export function SearchField({ value, onChange, placeholder, label, wide = false }) {
  return (
    <div
      className={`relative grid h-11 min-w-0 shrink-0 ${wide ? 'w-full' : 'w-full sm:w-max sm:max-w-full'}`}
    >
      {wide ? null : (
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 flex h-11 items-center whitespace-nowrap pl-11 pr-4 text-sm font-normal"
        >
          {placeholder}
        </span>
      )}
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xl text-on-surface-variant"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className="col-start-1 row-start-1 h-11 w-full rounded-full border border-outline bg-surface pl-11 pr-4 text-sm font-normal text-on-surface outline-none placeholder:text-on-surface focus:border-primary focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
    </div>
  );
}
