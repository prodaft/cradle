import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { SelectContent } from '@/components/custom/select';
import { ACCESS_OPTIONS } from '@/components/domain/manage/access-options';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareNetworkIcon, TrashIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type AccessLevel = components['schemas']['AccessTypeEnum'];
type ShareLevel = Exclude<AccessLevel, 'none'>;

const SHARE_OPTIONS = ACCESS_OPTIONS.filter(
    (option): option is (typeof ACCESS_OPTIONS)[number] & { value: ShareLevel } =>
        option.value !== 'none',
);

interface ShareNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    noteId: string;
}

/** Share a fleeting note with other users, read-only or read-write. */
export default function ShareNoteDialog({
    open,
    onOpenChange,
    noteId,
}: ShareNoteDialogProps) {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<Option[]>([]);
    const [newAccess, setNewAccess] = useState<ShareLevel>('read');

    useEffect(() => {
        if (open) return;
        setSelected([]);
        setNewAccess('read');
    }, [open]);

    const sharesQuery = $api.queryOptions(
        'get',
        '/notes/{note_id}/shares/',
        { params: { path: { note_id: noteId } } },
        { enabled: open && !!noteId },
    );
    const { data: shares, isPending } = useQuery(sharesQuery);

    const searchCandidates = async (search: string): Promise<Option[]> => {
        const { data } = await fetchClient.GET('/notes/{note_id}/shares/candidates/', {
            params: {
                path: { note_id: noteId },
                query: { page_size: 20, ...(search ? { search } : {}) },
            },
        });
        return (data?.results ?? []).map((user) => ({
            value: user.id as string,
            label: user.username,
        }));
    };

    const setShare = useMutation({
        mutationFn: async ({
            userId,
            accessType,
        }: {
            userId: string;
            accessType: AccessLevel;
        }) => {
            const { error, response } = await fetchClient.PUT(
                '/notes/{note_id}/shares/{user_id}/',
                {
                    params: { path: { note_id: noteId, user_id: userId } },
                    body: { access_type: accessType },
                },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Sharing updated' },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: sharesQuery.queryKey });
        },
    });

    const share = () => {
        const user = selected[0];
        if (!user) return;
        setShare.mutate(
            { userId: user.value, accessType: newAccess },
            { onSuccess: () => setSelected([]) },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Share note</DialogTitle>
                    <DialogDescription>
                        Give other users access to this fleeting note. They will be
                        notified. Sharing ends when the note is published.
                    </DialogDescription>
                </DialogHeader>
                <div className='flex items-start gap-2'>
                    <div className='flex-1 min-w-0'>
                        <MultipleSelector
                            inlineDropdown
                            value={selected}
                            onChange={setSelected}
                            maxSelected={1}
                            onSearch={searchCandidates}
                            triggerSearchOnFocus
                            placeholder='Search users...'
                            emptyIndicator={
                                <p className='text-center text-sm text-muted-foreground'>
                                    No users found
                                </p>
                            }
                        />
                    </div>
                    <Select
                        items={SHARE_OPTIONS}
                        value={newAccess}
                        onValueChange={(access) =>
                            access && setNewAccess(access as ShareLevel)
                        }
                    >
                        <SelectTrigger className='w-[130px]'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SHARE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        disabled={selected.length === 0 || setShare.isPending}
                        onClick={share}
                        data-testid='share-note-submit'
                    >
                        {setShare.isPending ? (
                            <Spinner />
                        ) : (
                            <ShareNetworkIcon weight='bold' />
                        )}
                        Share
                    </Button>
                </div>
                <div className='flex flex-col gap-1'>
                    <span className='text-sm font-medium'>Shared with</span>
                    {isPending ? (
                        <div className='flex justify-center py-4'>
                            <Spinner />
                        </div>
                    ) : !shares?.length ? (
                        <p className='text-sm text-muted-foreground py-2'>
                            Only you can see this note.
                        </p>
                    ) : (
                        <ul className='flex flex-col divide-y divide-border'>
                            {shares.map((item) => (
                                <li
                                    key={item.user.id}
                                    className='flex items-center gap-2 py-1.5'
                                >
                                    <span className='flex-1 truncate text-sm'>
                                        {item.user.username}
                                    </span>
                                    <Select
                                        items={SHARE_OPTIONS}
                                        value={item.access_type}
                                        onValueChange={(access) =>
                                            access &&
                                            access !== item.access_type &&
                                            setShare.mutate({
                                                userId: item.user.id as string,
                                                accessType: access as ShareLevel,
                                            })
                                        }
                                        disabled={setShare.isPending}
                                    >
                                        <SelectTrigger size='sm' className='w-[130px]'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SHARE_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Tooltip>
                                        <TooltipTrigger
                                            render={
                                                <Button
                                                    variant='ghost'
                                                    size='icon-sm'
                                                    disabled={setShare.isPending}
                                                    onClick={() =>
                                                        setShare.mutate({
                                                            userId: item.user
                                                                .id as string,
                                                            accessType: 'none',
                                                        })
                                                    }
                                                />
                                            }
                                        >
                                            <TrashIcon weight='bold' />
                                        </TooltipTrigger>
                                        <TooltipContent>Stop sharing</TooltipContent>
                                    </Tooltip>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
