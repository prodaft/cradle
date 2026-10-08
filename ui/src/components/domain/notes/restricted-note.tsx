import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { LockIcon } from '@phosphor-icons/react';
import { useRequestNoteAccess } from './use-request-note-access';

interface RestrictedNoteProps {
    noteId: string;
}

/** Shown instead of a note the user can't read when restricted note search is enabled (API returns 403). */
export default function RestrictedNote({ noteId }: RestrictedNoteProps) {
    const requestAccess = useRequestNoteAccess();
    return (
        <Empty className='h-full'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <LockIcon />
                </EmptyMedia>
                <EmptyTitle>403 - Restricted</EmptyTitle>
                <EmptyDescription>
                    This note belongs to an entity you don&apos;t have access to.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button
                    onClick={() => requestAccess.mutate(noteId)}
                    disabled={requestAccess.isPending || requestAccess.isSuccess}
                >
                    {requestAccess.isSuccess ? 'Access requested' : 'Request access'}
                </Button>
            </EmptyContent>
        </Empty>
    );
}
