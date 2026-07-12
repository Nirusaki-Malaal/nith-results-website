import '../styles/pagination.css';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function getPageItems(currentPage: number, totalPages: number) {
  const pages = [1, 2, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages]
    .filter((page) => page >= 1 && page <= totalPages)
    .filter((page, index, allPages) => allPages.indexOf(page) === index)
    .sort((first, second) => first - second);

  return pages.flatMap((page, index) => {
    const previousPage = pages[index - 1];
    return index > 0 && page - previousPage > 1 ? ['ellipsis', page] : [page];
  });
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Results pagination">
      <button
        className="pagination__control"
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      {pageItems.map((item, index) => {
        if (item === 'ellipsis') return <span key={`ellipsis-${index}`} className="pagination__ellipsis">…</span>;

        return (
          <button
            key={item}
            className={`pagination__page${item === currentPage ? ' pagination__page--current' : ''}`}
            type="button"
            aria-label={`Go to page ${item}`}
            aria-current={item === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(item as number)}
          >
            {item}
          </button>
        );
      })}
      <button
        className="pagination__control"
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
