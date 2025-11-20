import { Trash } from 'iconoir-react';
import { useEffect, useState, MouseEvent } from 'react';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import {
    capitalizeString,
    createDashboardLink,
} from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import Card from '@components/base/Card/Card';

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

interface RelationCardProps {
    relation: Relation;
    onDelete?: () => void;
    setAlert: (alert: Alert) => void;
}

export default function RelationCard({ relation, onDelete, setAlert }: RelationCardProps) {
    const [formattedCreated, setFormattedCreated] = useState('');
    const [formattedSeen, setFormattedSeen] = useState('');
    const [visible, setVisible] = useState(true);
    const { isAdmin } = useProfile();
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();

    useEffect(() => {
        setFormattedCreated(formatDate(new Date(relation.created_at)));
        setFormattedSeen(formatDate(new Date(relation.last_seen)));
    }, [relation.created_at, relation.last_seen]);

    const handleDelete = async () => {
        try {
            await entriesApi.entriesRelationsDestroy({ id: relation.id });
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

    const handleEntryClick = (name: string, subtype: string) => (e: MouseEvent) => {
        const link = createDashboardLink({ name, subtype });
        navigate(link, { event: e });
    };

    const actions = [
        {
            icon: <Trash className='w-5 h-5' />,
            onClick: handleDelete,
            tooltip: 'Delete Relation',
            show: isAdmin(),
            variant: 'danger' as const,
        },
    ];

    // Build details object with simple string values
    const cardDetails: Record<string, any> = {
        'Created At': formattedCreated,
        'Last Seen': formattedSeen,
        ...Object.fromEntries(
            Object.entries(relation.details).map(([key, value]) => [
                capitalizeString(key),
                value
            ])
        ),
    };

    return (
        <Card
            title={capitalizeString(relation.reason || 'Relation')}
            actions={actions}
            visible={visible}
            slug={`ID: ${relation.id}`}
            details={cardDetails}
        >
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1 mx-2 -mt-1 mb-2'>
                <InfoRow label='Entity 1'>
                    <span
                        className='underline cursor-pointer'
                        style={{ color: relation.e1.color || '#2563eb' }}
                        onClick={handleEntryClick(
                            relation.e1.name,
                            relation.e1.subtype,
                        )}
                    >
                        [{relation.e1.subtype}] {relation.e1.name}
                    </span>
                </InfoRow>
                <InfoRow label='Entity 2'>
                    <span
                        className='underline cursor-pointer'
                        style={{ color: relation.e2.color || '#2563eb' }}
                        onClick={handleEntryClick(relation.e2.name, relation.e2.subtype)}
                    >
                        [{relation.e2.subtype}] {relation.e2.name}
                    </span>
                </InfoRow>
            </div>
        </Card>
    );
}

interface InfoRowProps {
    label: string;
    children: React.ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
    return (
        <div className='grid grid-cols-[100px_1fr] items-start gap-2'>
            <strong className='text-gray-800 dark:text-gray-200'>{label}</strong>
            <div>{children}</div>
        </div>
    );
}
