import { Trash } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { deleteRelation } from '../../services/graphService/graphService';
import {
    capitalizeString,
    createDashboardLink,
} from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';

export default function RelationCard({ relation, onDelete, setAlert }) {
    const [formattedCreated, setFormattedCreated] = useState('');
    const [formattedSeen, setFormattedSeen] = useState('');
    const [visible, setVisible] = useState(true);
    const { isAdmin } = useProfile();
    const { navigate, navigateLink } = useCradleNavigate();

    useEffect(() => {
        setFormattedCreated(formatDate(new Date(relation.created_at)));
        setFormattedSeen(formatDate(new Date(relation.last_seen)));
    }, [relation.created_at, relation.last_seen]);

    const handleDelete = async () => {
        try {
            await deleteRelation(relation.id);
            setVisible(false);
            setAlert({
                show: true,
                message: 'Relation deleted successfully',
                color: 'green',
            });
            if (onDelete) onDelete();
        } catch (error) {
            console.error('Delete relation failed:', error);
            setAlert({
                show: true,
                message: 'Failed to delete relation',
                color: 'red',
            });
        }
    };

    const handleEntryClick = (name, subtype) => (e) => {
        const link = createDashboardLink({ name, subtype });
        navigate(link, { event: e });
    };

    if (!visible) return null;

    return (
        <div className='bg-white dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg hover:shadow-xl  m-2 relative'>
            <div className='flex justify-between items-center mb-2'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                    {capitalizeString(relation.reason || 'Relation')}
                </h2>
                {isAdmin() && (
                    <button
                        title='Delete Relation'
                        className='text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 '
                        onClick={handleDelete}
                    >
                        <Trash className='w-5 h-5' />
                    </button>
                )}
            </div>
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1'>
                <InfoRow label='Entity 1:'>
                    <span
                        className='underline cursor-pointer'
                        style={{ color: relation.e1.color || '#2563eb' }} // default to blue if missing
                        onClick={handleEntryClick(
                            relation.e1.name,
                            relation.e1.subtype,
                        )}
                    >
                        [{relation.e1.subtype}] {relation.e1.name}
                    </span>
                </InfoRow>
                <InfoRow label='Entity 2:'>
                    <span
                        className='underline cursor-pointer'
                        style={{ color: relation.e2.color || '#2563eb' }}
                        onClick={() =>
                            handleEntryClick(relation.e2.name, relation.e2.subtype)
                        }
                    >
                        [{relation.e2.subtype}] {relation.e2.name}
                    </span>
                </InfoRow>
                <InfoRow label='Created At:'>{formattedCreated}</InfoRow>
                <InfoRow label='Last Seen:'>{formattedSeen}</InfoRow>
                {Object.keys(relation.details).map((key) => (
                    <InfoRow key={key} label={`${capitalizeString(key)}:`}>
                        {relation.details[key]}
                    </InfoRow>
                ))}
            </div>
            <div className='absolute bottom-1 right-2 text-[10px] text-gray-400 dark:text-gray-600 select-text mt-1'>
                ID: {relation.id}
            </div>
        </div>
    );
}

function InfoRow({ label, children }) {
    return (
        <div className='grid grid-cols-[100px_1fr] items-start gap-2'>
            <strong className='text-gray-800 dark:text-gray-200'>{label}</strong>
            <div>{children}</div>
        </div>
    );
}
