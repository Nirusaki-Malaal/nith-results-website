import '../styles/loading-overlay.css';
import Loader from './loader';

type LoadingOverlayProps = {
  visible: boolean;
};

function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <Loader />
      <span className="loading-overlay__text">Fetching NIT Hamirpur Results…</span>
    </div>
  );
}

export default LoadingOverlay;
