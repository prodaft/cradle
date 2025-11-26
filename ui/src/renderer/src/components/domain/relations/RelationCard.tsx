import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Relation } from '@/services/cradle';
import { capitalizeString, createDashboardLink } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { Trash } from 'iconoir-react';
import { ReactNode, useEffect, useState } from 'react';
import Card from '../../base/Card/Card';

interface RelationCardProps {
    relation: Relation;
    onDelete?: () => void;
}

export default function RelationCard({ relation, onDelete }: RelationCardProps) {
    const [formattedCreated, setFormattedCreated] = useState('');
    const [formattedSeen, setFormattedSeen] = useState('');
    const [visible, setVisible] = useState(true);
    const { isAdmin } = useProfile();
    const { entriesApi } = useApi();
    const { navigate } = useCradleNavigate();
    const { execute } = useAPICall();

    useEffect(() => {
        setFormattedCreated(formatDate(new Date(relation.createdAt || '')));
        setFormattedSeen(formatDate(new Date(relation.lastSeen || '')));
    }, [relation.createdAt, relation.lastSeen]);

    const handleDelete = async () => {
        await entriesApi.entriesRelationsDestroy({ relationId: relation.id! });
        setVisible(false);
        if (onDelete) onDelete();
    };

    const handleEntryClick =
        (name: string, subtype: string) => (e: React.MouseEvent) => {
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

    const cardDetails = {
        'Created At': formattedCreated,
        'Last Seen': formattedSeen,
        ...Object.fromEntries(
            Object.entries(relation.details).map(([key, value]) => [
                capitalizeString(key),
                value,
            ]),
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
                        style={{ color: relation.e1?.color || '#2563eb' }}
                        onClick={handleEntryClick(
                            relation.e1?.name || '',
                            relation.e1?.subtype || '',
                        )}
                    >
                        [{relation.e1?.subtype}] {relation.e1?.name}
                    </span>
                </InfoRow>
                <InfoRow label='Entity 2'>
                    <span
                        className='underline cursor-pointer'
                        style={{ color: relation.e2?.color || '#2563eb' }}
                        onClick={handleEntryClick(
                            relation.e2?.name || '',
                            relation.e2?.subtype || '',
                        )}
                    >
                        [{relation.e2?.subtype}] {relation.e2?.name}
                    </span>
                </InfoRow>
            </div>
        </Card>
    );
}

interface InfoRowProps {
    label: string;
    children: ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
    return (
        <div className='grid grid-cols-[100px_1fr] items-start gap-2'>
            <strong className='text-gray-800 dark:text-gray-200'>{label}</strong>
            <div>{children}</div>
        </div>
    );
}
