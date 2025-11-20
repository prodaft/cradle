import { Clock, Link, User } from 'iconoir-react';
import { formatDate } from '@/utils/dates';
import Tooltip from '../../base/Tooltip/Tooltip';

/**
 * Displays note metadata (timestamps, author, editor)
 */
export default function NoteMetadata({ note, isFleeting }) {
    return (
        <div className='flex items-center gap-4 cradle-mono text-xs cradle-text-tertiary'>
            <Tooltip content="Created">
                <span className='inline-flex items-center gap-1.5'>
                    <Clock width='16' height='16' />
                    <span className='cradle-text-tertiary'>
                        {formatDate(new Date(note.timestamp))}
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
                                {formatDate(new Date(note.edit_timestamp))}
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
            {note.last_linked && (
                <Tooltip content="Last Linked">
                    <span className='inline-flex items-center gap-1.5'>
                        <Link width='16' height='16' />
                        <span className='cradle-text-tertiary'>
                            {formatDate(new Date(note.last_linked))}
                        </span>
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
