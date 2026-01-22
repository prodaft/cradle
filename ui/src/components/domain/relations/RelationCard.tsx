import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { Relation } from '@/services/cradle';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { TrashIcon } from '@phosphor-icons/react';
import { startCase } from 'lodash';
import { useEffect, useState } from 'react';

interface RelationCardProps {
    relation: Relation;
    onDelete?: () => void;
}

export default function RelationCard({ relation, onDelete }: RelationCardProps) {
    const [formattedCreated, setFormattedCreated] = useState('');
    const [formattedSeen, setFormattedSeen] = useState('');
    const [visible, setVisible] = useState(true);
    const { isAdmin } = useAuthState();
    const { entriesApi } = useApi();
    const router = useRouter();

    const deleteMutation = useMutation({
        mutationFn: async (relationId: string) => {
            await entriesApi.entriesRelationsDestroy({ relationId });
        },
        meta: {
            successMessage: 'Relation deleted successfully',
            errorMessage: 'Failed to delete relation',
        },
        onSuccess: () => {
            setVisible(false);
            if (onDelete) onDelete();
        },
    });

    useEffect(() => {
        setFormattedCreated(
            relation.createdAt
                ? format(new Date(relation.createdAt), 'dd/MM/yyyy, HH:mm')
                : 'N/A',
        );
        setFormattedSeen(
            relation.lastSeen
                ? format(new Date(relation.lastSeen), 'dd/MM/yyyy, HH:mm')
                : 'N/A',
        );
    }, [relation.createdAt, relation.lastSeen]);

    const handleDelete = () => {
        deleteMutation.mutate(relation.id!);
    };

    const handleEntryClick =
        (name: string, subtype: string) => (e: React.MouseEvent) => {
            router.navigate({
                to: '/dashboards/$subtype/$name',
                params: { subtype, name }
            });
        };

    const cardDetails = {
        'Created At': formattedCreated,
        'Last Seen': formattedSeen,
        ...Object.fromEntries(
            Object.entries(relation.details).map(([key, value]) => [
                startCase(key),
                value,
            ]),
        ),
    };

    if (!visible) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{startCase(relation.reason || 'Relation')}</CardTitle>
                {isAdmin && (
                    <CardAction>
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={handleDelete}
                            title='Delete Relation'
                        >
                            <TrashIcon className='w-5 h-5' weight="bold" />
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
                    <div className='grid grid-cols-[100px_1fr] items-start gap-2'>
                        <strong className='text-foreground'>Entity 1</strong>
                        <div>
                            <span
                                className={`underline cursor-pointer px-1 py-0.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors ${!relation.e1?.color ? 'text-primary' : ''}`}
                                style={
                                    relation.e1?.color
                                        ? { color: relation.e1.color }
                                        : undefined
                                }
                                onClick={handleEntryClick(
                                    relation.e1?.name || '',
                                    relation.e1?.subtype || '',
                                )}
                            >
                                [{relation.e1?.subtype}] {relation.e1?.name}
                            </span>
                        </div>
                    </div>
                    <div className='grid grid-cols-[100px_1fr] items-start gap-2'>
                        <strong className='text-foreground'>Entity 2</strong>
                        <div>
                            <span
                                className={`underline cursor-pointer px-1 py-0.5 rounded hover:bg-secondary hover:text-secondary-foreground transition-colors ${!relation.e2?.color ? 'text-primary' : ''}`}
                                style={
                                    relation.e2?.color
                                        ? { color: relation.e2.color }
                                        : undefined
                                }
                                onClick={handleEntryClick(
                                    relation.e2?.name || '',
                                    relation.e2?.subtype || '',
                                )}
                            >
                                [{relation.e2?.subtype}] {relation.e2?.name}
                            </span>
                        </div>
                    </div>
                </div>
                <div className='text-[10px] text-muted-foreground select-text mt-2'>
                    ID: {relation.id}
                </div>
            </CardContent>
        </Card>
    );
}
