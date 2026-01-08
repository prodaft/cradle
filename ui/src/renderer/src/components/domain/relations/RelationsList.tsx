import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import { Relation } from '@/services/cradle';
import Pagination from '@components/base/Pagination/Pagination';
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
    const [relations, setRelations] = useState<Relation[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const { entriesApi } = useApi();
    const { execute } = useAPICall();

    useEffect(() => {
        fetchRelations();
    }, [search, page]);

    useEffect(() => {
        setPage(1);
        fetchRelations();
    }, [query]);

    const fetchRelations = async () => {
        setLoading(true);
        try {
            const response = await execute(
                () =>
                    entriesApi.entriesRelationsRetrieve({
                        page: page,
                        ...query,
                    }),
                {
                    errorMessage: 'Failed to fetch relations',
                },
            );
            setRelations(response.results);
            setTotalPages(response.totalPages);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setRelations((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <div className='p-4'>
            {loading ? (
                <div className='flex items-center justify-center min-h-[200px]'>
                    <div className='cradle-spinner-dot-pulse cradle-spinner-xl'>
                        <div className='cradle-spinner-pulse-dot'></div>
                    </div>
                </div>
            ) : relations.length === 0 ? (
                <p className='text-center text-cradle-text-muted text-sm'>
                    No relations found.
                </p>
            ) : (
                <div className='grid gap-4'>
                    {relations.map((relation) => {
                        return (
                            <RelationCard
                                key={relation.id}
                                relation={relation}
                                onDelete={() => handleDelete(relation.id!)}
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
