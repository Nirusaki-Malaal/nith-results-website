import '../styles/search-panel.css';
import Icon from './icon';

type SearchPanelProps = {
  query: string;
  onQueryChange: (val: string) => void;
  sortField: 'roll' | 'cgpa' | 'name';
  onSortFieldChange: (val: 'roll' | 'cgpa' | 'name') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (val: 'asc' | 'desc') => void;
  branch: string;
  onBranchChange: (val: string) => void;
  batch: string;
  onBatchChange: (val: string) => void;
  isLoading: boolean;
  hint: string;
};

const SORT_LABELS = { roll: 'Roll No', cgpa: 'CGPA', name: 'Name' };

function SearchPanel({
  query,
  onQueryChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  branch,
  onBranchChange,
  batch,
  onBatchChange,
  isLoading,
  hint,
}: SearchPanelProps) {
  return (
    <section className="search-panel" aria-labelledby="search-panel-title">
      <h2 id="search-panel-title" className="visually-hidden">Search and filter student results</h2>
      <div className="search-field" role="search">
        <Icon name="search" className="search-field__icon" />
        <input
          className="search-field__input"
          type="search"
          placeholder="Search NITH student name or roll number…"
          aria-label="Search NIT Hamirpur students by name or roll number"
          aria-describedby="search-hint"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button
            className="search-field__clear"
            type="button"
            aria-label="Clear student search"
            onClick={() => onQueryChange('')}
          >
            <Icon name="close" />
          </button>
        ) : null}
      </div>
      <p id="search-hint" className="search-panel__hint" aria-live="polite">
        {isLoading ? 'Searching student results…' : hint}
      </p>

      <div className="filter-list" aria-label="Student result controls">
        <div className="chip-wrapper">
          <span className="filter-chip filter-chip--active">
            <Icon name="sort" className="filter-chip__icon" />
            Sort by: {SORT_LABELS[sortField]}
            <Icon name="arrow_drop_down" className="filter-chip__chevron" />
          </span>
          <select value={sortField} onChange={(e) => onSortFieldChange(e.target.value as any)}>
            <option value="roll">Roll Number</option>
            <option value="cgpa">CGPA</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="chip-wrapper">
          <span className="filter-chip">
            <Icon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="filter-chip__icon" />
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            <Icon name="arrow_drop_down" className="filter-chip__chevron" />
          </span>
          <select value={sortOrder} onChange={(e) => onSortOrderChange(e.target.value as any)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <div className="chip-wrapper">
          <span className={`filter-chip${branch !== 'All' ? ' filter-chip--active' : ''}`}>
            <Icon name="category" className="filter-chip__icon" />
            {branch === 'All' ? 'All Branches' : branch}
            <Icon name="arrow_drop_down" className="filter-chip__chevron" />
          </span>
          <select value={branch} onChange={(e) => onBranchChange(e.target.value)}>
            <option value="All">All Branches</option>
            <option value="BAR">Architecture (BAR)</option>
            <option value="BCS">Computer Science (BCS)</option>
            <option value="BEC">Electronics (BEC)</option>
            <option value="BEE">Electrical (BEE)</option>
            <option value="BME">Mechanical (BME)</option>
            <option value="BCE">Civil (BCE)</option>
            <option value="BCH">Chemical (BCH)</option>
            <option value="BMA">Maths & Computing (BMA)</option>
            <option value="BPH">Eng. Physics (BPH)</option>
            <option value="BMS">Material Science (BMS)</option>
            <option value="DCS">Dual Degree CS (DCS)</option>
            <option value="DEC">Dual Degree ECE (DEC)</option>
          </select>
        </div>

        <div className="chip-wrapper">
          <span className={`filter-chip${batch !== 'All' ? ' filter-chip--active' : ''}`}>
            <Icon name="date_range" className="filter-chip__icon" />
            {batch === 'All' ? 'All Batches' : `Batch ${batch}`}
            <Icon name="arrow_drop_down" className="filter-chip__chevron" />
          </span>
          <select value={batch} onChange={(e) => onBatchChange(e.target.value)}>
            <option value="All">All Batches</option>
            <option value="2024">2024 (Roll 20)</option>
            <option value="2025">2025 (Roll 21)</option>
            <option value="2026">2026 (Roll 22)</option>
            <option value="2027">2027 (Roll 23)</option>
            <option value="2028">2028 (Roll 24)</option>
            <option value="2029">2029 (Roll 25)</option>
          </select>
        </div>
      </div>
    </section>
  );
}

export default SearchPanel;
