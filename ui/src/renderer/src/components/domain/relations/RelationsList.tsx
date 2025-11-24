import { useEffect, useState } from 'react';
import useApi from '@/hooks/api/useApi';
import { useProfile } from '@/hooks/auth/useProfile';
import AlertBox from '@components/base/Alert/AlertBox';
import Pagination from '@components/base/Pagination/Pagination';
import RelationCard from './RelationCard';

interface Entity {
    name: string;
    subtype: string;
    color?: string;
}

interface Relation {
    id: string;
    created_at: string;
    last_seen: string;
    reason?: string;
    e1: Entity;
    e2: Entity;
    details: Record<string, any>;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface Query {
    [key: string]: any;
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
    const { profile } = useProfile();
    const { entriesApi } = useApi();
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });

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
            const response = await entriesApi.entriesRelationsList({
                page: page,
                wildcard: true,
                ...query,
            });
            setRelations(response.results);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to fetch relations:', error);
            setAlert({
                show: true,
                message: 'Error fetching relations',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setRelations((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <div className='p-4'>
            <AlertBox alert={alert} />
            {loading ? (
                <div className='flex items-center justify-center min-h-screen'>
                    <div className='spinner-dot-pulse'>
                        <div className='spinner-pulse-dot'></div>
                    </div>
                </div>
            ) : relations.length === 0 ? (
                <p className='text-center text-gray-500 dark:text-gray-400'>
                    No relations found.
                </p>
            ) : (
                <div className='grid gap-4'>
                    {relations.map((relation) => {
                        return (
                            <RelationCard
                                key={relation.id}
                                relation={relation}
                                onDelete={() => handleDelete(relation.id)}
                                setAlert={setAlert}
                            />
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => setPage(newPage)}
                />
            )}
        </div>
    );
}
