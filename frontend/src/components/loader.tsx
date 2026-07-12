import type { CSSProperties } from 'react';
import '../styles/loader.css';

type LoaderProps = {
  size?: number;
};

export default function Loader({ size = 48 }: LoaderProps) {
  const style: CSSProperties & { '--loader-size': string } = { '--loader-size': `${size}px` };

  return (
    <div className="loader-wrapper" style={style}>
      <div className="loader" aria-hidden="true" />
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}
