import type { ReactNode } from 'react';
import Loader from './loader';

type StudentGridProps = {
  children: ReactNode;
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  searchTerm: string;
  emptyMessage: string;
};

function StudentGrid({
  children,
  isLoading,
  error,
  totalResults,
  searchTerm,
  emptyMessage,
}: StudentGridProps) {
  const title = searchTerm ? 'Search results' : 'Student results';
  const resultLabel = isLoading
    ? 'Loading results'
    : `${totalResults.toLocaleString('en-IN')} ${totalResults === 1 ? 'student' : 'students'}`;

  return (
    <section className="student-results" aria-labelledby="student-results-title">
      <div className="student-results__heading">
        <div>
          <p className="section-kicker">Student results</p>
          <h2 id="student-results-title">{title}</h2>
        </div>
        <span className="preview-badge">{resultLabel}</span>
      </div>
      <div className="results-grid" role={isLoading || error || totalResults === 0 ? undefined : 'list'}>
        {isLoading ? (
          <div className="results-state" role="status">
            <Loader size={40} />
            <p>Loading student results…</p>
          </div>
        ) : null}
        {!isLoading && error ? <p className="results-state results-state--error">{error}</p> : null}
        {!isLoading && !error && totalResults === 0 ? (
          <p className="results-state">{emptyMessage}</p>
        ) : null}
        {!isLoading && !error && totalResults > 0 ? children : null}
      </div>
    </section>
  );
}

export default StudentGrid;
