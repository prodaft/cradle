import { useEffect, useState } from 'react';
import RelationCard from './RelationCard';
import Pagination from '../Pagination/Pagination';
import { getRelations } from '../../services/graphService/graphService';
import AlertBox from '../AlertBox/AlertBox';

export default function RelationsList({ query }) {
    const [relations, setRelations] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

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
            const response = await getRelations(query, page);
            const data = response.data;
            console.log(data);
            setRelations(data.results);
            setTotalPages(data.total_pages);
            setAlert({
                show: false,
                message: 'Error fetching relations',
                color: 'red',
            });
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

    const handleDelete = (id) => {
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
