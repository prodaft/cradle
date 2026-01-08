import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Relation } from '@/services/cradle';
import { capitalizeString, createDashboardLink } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { Trash } from 'iconoir-react';
import { ReactNode, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

    if (!visible) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{capitalizeString(relation.reason || 'Relation')}</CardTitle>
                {isAdmin() && (
                    <CardAction>
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={handleDelete}
                            title='Delete Relation'
                        >
                            <Trash className='w-5 h-5' />
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                <div className='text-foreground text-sm space-y-1 mb-2'>
                    {Object.entries(cardDetails).map(([key, value]) => (
                        <div key={key} className='items-start gap-2'>
                            <strong className='text-foreground mr-1'>{key}:</strong>
                            {value}
                        </div>
                    ))}
                </div>
                <div className='text-foreground text-sm space-y-1 -mt-1 mb-2'>
                    <InfoRow label='Entity 1'>
                        <span
                            className={`underline cursor-pointer px-1 py-0.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors ${!relation.e1?.color ? 'text-primary' : ''}`}
                            style={relation.e1?.color ? { color: relation.e1.color } : undefined}
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
                            className={`underline cursor-pointer px-1 py-0.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors ${!relation.e2?.color ? 'text-primary' : ''}`}
                            style={relation.e2?.color ? { color: relation.e2.color } : undefined}
                            onClick={handleEntryClick(
                                relation.e2?.name || '',
                                relation.e2?.subtype || '',
                            )}
                        >
                            [{relation.e2?.subtype}] {relation.e2?.name}
                        </span>
                    </InfoRow>
                </div>
                <div className='text-[10px] text-muted-foreground select-text mt-2'>
                    ID: {relation.id}
                </div>
            </CardContent>
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
            <strong className='text-foreground'>{label}</strong>
            <div>{children}</div>
        </div>
    );
}
