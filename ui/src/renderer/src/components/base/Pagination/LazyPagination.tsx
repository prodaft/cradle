import { Button } from '@/components/ui/button';

interface LazyPaginationProps {
    currentPage: number;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    maxVisible?: number;
}

export default function LazyPagination({
    currentPage,
    hasNextPage,
    onPageChange,
    maxVisible = 7,
}: LazyPaginationProps) {
    const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = currentPage + Math.floor(maxVisible / 2);

    const pages = Array.from({ length: maxVisible }, (_, i) => startPage + i).filter(
        (page) => page <= currentPage,
    ); // avoid jumping ahead if no more pages

    return (
        <div className='pagination flex justify-center mt-4 mb-4 items-center'>
            {/* Left Arrow */}
            <Button
                variant='outline'
                size='default'
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                &lt;
            </Button>

            {/* Page Numbers */}
            {pages.map((page) => (
                <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size='default'
                    onClick={() => onPageChange(page)}
                    disabled={page === currentPage}
                >
                    {page}
                </Button>
            ))}

            {/* Right Arrow */}
            <Button
                variant='outline'
                size='default'
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
            >
                &gt;
            </Button>
        </div>
    );
}
