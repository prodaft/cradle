export default function LazyPagination({
    currentPage,
    hasNextPage,
    onPageChange,
    maxVisible = 7,
}) {
    const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = currentPage + Math.floor(maxVisible / 2);

    const pages = Array.from({ length: maxVisible }, (_, i) => startPage + i).filter(
        (page) => page <= currentPage,
    ); // avoid jumping ahead if no more pages

    return (
        <div className='pagination flex justify-center mt-4 mb-4 items-center'>
            {/* Left Arrow */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className='btn'
            >
                &lt;
            </button>

            {/* Page Numbers */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    disabled={page === currentPage}
                    className={`btn ${page === currentPage ? 'btn-disabled' : ''}`}
                >
                    {page}
                </button>
            ))}

            {/* Right Arrow */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className='btn'
            >
                &gt;
            </button>
        </div>
    );
}
