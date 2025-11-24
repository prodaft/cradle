import { Clock, Link, User } from 'iconoir-react';
import type { NoteRetrieve } from '@services/cradle/models';
import { formatDate } from '@/utils/dates';
import Tooltip from '../../base/Tooltip/Tooltip';

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
            <Tooltip content="Created">
                <span className='inline-flex items-center gap-1.5'>
                    <Clock width='16' height='16' />
                    <span className='cradle-text-tertiary'>
                        {note.timestamp && formatDate(new Date(note.timestamp))}
                    </span>
                </span>
            </Tooltip>
            {!isFleeting && (
                <Tooltip content="Creator">
                    <span className='inline-flex items-center gap-1.5'>
                        <User width='16' height='16' />
                        <span className='cradle-text-secondary'>
                            {note?.author ? note.author.username : 'Unknown'}
                        </span>
                    </span>
                </Tooltip>
            )}
            {!isFleeting && note.editor && (
                <>
                    <Tooltip content="Edited">
                        <span className='inline-flex items-center gap-1.5'>
                            <Clock width='16' height='16' />
                            <span className='cradle-text-tertiary'>
                                {note.editTimestamp && formatDate(new Date(note.editTimestamp))}
                            </span>
                        </span>
                    </Tooltip>
                    <Tooltip content="Editor">
                        <span className='inline-flex items-center gap-1.5'>
                            <User width='16' height='16' />
                            <span className='cradle-text-secondary'>
                                {note?.editor ? note.editor.username : 'Unknown'}
                            </span>
                        </span>
                    </Tooltip>
                </>
            )}
            {note.lastLinked && (
                <Tooltip content="Last Linked">
                    <span className='inline-flex items-center gap-1.5'>
                        <Link width='16' height='16' />
                        <span className='cradle-text-tertiary'>
                            {formatDate(new Date(note.lastLinked))}
                        </span>
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
