import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClockIcon, LinkIcon, UserIcon } from '@phosphor-icons/react';
import type { NoteRetrieve } from '@services/cradle/models';
import { format } from 'date-fns';

interface NoteMetadataProps {
    note: NoteRetrieve;
    isFleeting?: boolean;
}

/**
 * Displays note metadata (timestamps, author, editor)
 */
export default function NoteMetadata({ note, isFleeting }: NoteMetadataProps) {
    return (
        <div className='flex items-center gap-4 font-mono tracking-wide text-xs text-muted-foreground'>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center gap-1.5'>
                        <ClockIcon size={16} weight='bold' />
                        <span className='text-muted-foreground'>
                            {note.timestamp
                                ? format(new Date(note.timestamp), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>Created</TooltipContent>
            </Tooltip>
            {!isFleeting && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center gap-1.5'>
                            <UserIcon size={16} weight='bold' />
                            <span className='text-foreground'>
                                {note?.author ? note.author.username : 'Unknown'}
                            </span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Creator</TooltipContent>
                </Tooltip>
            )}
            {!isFleeting && note.editor && (
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className='inline-flex items-center gap-1.5'>
                                <ClockIcon size={16} weight='bold' />
                                <span className='text-muted-foreground'>
                                    {note.editTimestamp
                                        ? format(
                                              new Date(note.editTimestamp),
                                              'dd/MM/yyyy, HH:mm',
                                          )
                                        : 'N/A'}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Edited</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className='inline-flex items-center gap-1.5'>
                                <UserIcon size={16} weight='bold' />
                                <span className='text-foreground'>
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Editor</TooltipContent>
                    </Tooltip>
                </>
            )}
            {note.lastLinked && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center gap-1.5'>
                            <LinkIcon size={16} weight='bold' />
                            <span className='text-muted-foreground'>
                                {format(new Date(note.lastLinked), 'dd/MM/yyyy, HH:mm')}
                            </span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Last Linked</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
