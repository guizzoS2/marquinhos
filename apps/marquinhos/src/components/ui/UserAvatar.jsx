import { Icon } from './Icon';

export function UserAvatar({ src, className = 'h-9 w-9', rounded = 'rounded-full', iconClass = '' }) {
  if (src) {
    return <img alt="" src={src} className={`${className} ${rounded} object-cover`} />;
  }

  return (
    <span
      className={`${className} ${rounded} inline-flex items-center justify-center overflow-hidden bg-primary text-on-primary`}
    >
      <Icon name="person" className={iconClass} />
    </span>
  );
}
