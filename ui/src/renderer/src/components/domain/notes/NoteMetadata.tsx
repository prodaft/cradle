import { formatDate } from '@/utils/dates';
import type { NoteRetrieve } from '@services/cradle/models';
import { Clock, Link, User } from 'iconoir-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NoteMetadataProps {
    note: NoteRetrieve;
    isFleeting?: boolean;
}

/**
 * Displays note metadata (timestamps, author, editor)
 */
export default function NoteMetadata({ note, isFleeting }: NoteMetadataProps) {
    return (
        <div className='flex items-center gap-4 cradle-mono text-xs cradle-text-tertiary'>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center gap-1.5'>
                        <Clock width='16' height='16' />
                        <span className='cradle-text-tertiary'>
                            {note.timestamp && formatDate(new Date(note.timestamp))}
                        </span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    Created
                </TooltipContent>
            </Tooltip>
            {!isFleeting && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center gap-1.5'>
                            <User width='16' height='16' />
                            <span className='cradle-text-secondary'>
                                {note?.author ? note.author.username : 'Unknown'}
                            </span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        Creator
                    </TooltipContent>
                </Tooltip>
            )}
            {!isFleeting && note.editor && (
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className='inline-flex items-center gap-1.5'>
                                <Clock width='16' height='16' />
                                <span className='cradle-text-tertiary'>
                                    {note.editTimestamp &&
                                        formatDate(new Date(note.editTimestamp))}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            Edited
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className='inline-flex items-center gap-1.5'>
                                <User width='16' height='16' />
                                <span className='cradle-text-secondary'>
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            Editor
                        </TooltipContent>
                    </Tooltip>
                </>
            )}
            {note.lastLinked && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center gap-1.5'>
                            <Link width='16' height='16' />
                            <span className='cradle-text-tertiary'>
                                {formatDate(new Date(note.lastLinked))}
                            </span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        Last Linked
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
