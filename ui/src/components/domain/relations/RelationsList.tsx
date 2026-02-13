import Pagination from '@/components/base/Pagination/Pagination';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/use-api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import RelationCard from './RelationCard';

interface Entity {
    name: string;
    subtype: string;
    color?: string;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface Query {
    relates: Array<number>;
}

interface RelationsListProps {
    query: Query;
}

export default function RelationsList({ query }: RelationsListProps) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const { entriesApi } = useApi();

    // Query for relations
    const { data: relationsData, isPending: loading } = useQuery({
        queryKey: ['relations', 'list', { page, search, ...query }],
        queryFn: async () => {
            return await (entriesApi.entriesRelationsRetrieve as any)({
                page: page,
                ...query,
            });
        },
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch relations',
        },
    });

    const relations = (relationsData as any)?.results || [];
    const totalPages = (relationsData as any)?.totalPages || 1;

    // Reset to page 1 when query changes
    useEffect(() => {
        setPage(1);
    }, [query]);

    // Note: handleDelete would need query invalidation instead of local state
    const handleDelete = (id: string) => {
        // This would need to be a mutation that invalidates the query
        // For now, keeping the original behavior would require local state
        // or implementing a delete mutation
    };

    return (
        <div className='p-4'>
            {loading ? (
                <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                    <Spinner className='size-10' />
                </div>
            ) : relations.length === 0 ? (
                <p className='text-center text-muted-foreground text-sm'>
                    No relations found.
                </p>
            ) : (
                <div className='grid gap-4'>
                    {relations.map((relation) => {
                        return (
                            <RelationCard
                                key={relation.id}
                                relation={relation}
                                onDelete={() => {
                                    // TODO: Implement delete mutation with query invalidation
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className='mt-4'>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={(newPage) => setPage(newPage)}
                    />
                </div>
            )}
        </div>
    );
}
