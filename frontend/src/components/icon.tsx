import type { CSSProperties } from 'react';

type IconProps = {
  name: string;
  className?: string;
  style?: CSSProperties;
};

function Icon({ name, className = '', style }: IconProps) {
  return (
    <span className={`material-symbols-rounded ${className}`.trim()} aria-hidden="true" style={style}>
      {name}
    </span>
  );
}

export default Icon;
