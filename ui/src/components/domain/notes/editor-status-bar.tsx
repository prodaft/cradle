import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NoteIssueRow } from '@/utils/editor/note-issues';
import {
    CaretUpIcon,
    CheckIcon,
    CircleDashedIcon,
    WarningIcon,
    WifiHighIcon,
    WifiSlashIcon,
    XCircleIcon,
} from '@phosphor-icons/react';
import type { components } from '@services/openapi/schema';
import { type ReactNode, useState } from 'react';
import type { ConnectionNotice } from './connection-toast';
import type { getSaveStatus } from './status-indicators';

type NoteProcessingStatus = components['schemas']['NoteRetrieve']['status'];
type SaveStatus = ReturnType<typeof getSaveStatus>;

export type VimMode = 'normal' | 'insert' | 'visual' | 'replace';
type SyncIndicator = 'live' | ConnectionNotice;
export type TextCounts = { words: number; chars: number };

export function countText(text: string): TextCounts {
    return {
        words: text.trim().split(/\s+/).filter(Boolean).length,
        chars: text.length,
    };
}

export function formatNoteStatusLabel(
    status: NoteProcessingStatus | undefined,
): string {
    if (!status) return '—';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// The footer is a size container: below 40rem chars and a healthy Live drop,
// below 28rem words drop and labels collapse to icons.
const HIDE_NARROW = '@max-[40rem]:hidden';
const HIDE_TINY = '@max-[28rem]:hidden';

const VIM_MODE_CLASS: Record<VimMode, string> = {
    normal: 'bg-muted text-foreground',
    insert: 'bg-primary text-primary-foreground',
    visual: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
    replace: 'bg-destructive/15 text-destructive',
};

const LIVE_STATUS: Record<
    SyncIndicator,
    { label: string; tooltip: string; icon: ReactNode }
> = {
    live: {
        label: 'Live',
        tooltip: 'Connected. Edits sync with collaborators.',
        icon: (
            <WifiHighIcon
                className='size-3.5 text-green-600 dark:text-green-500'
                weight='bold'
            />
        ),
    },
    offline: {
        label: 'Reconnecting',
        tooltip: 'Lost connection. Reconnecting…',
        icon: <Spinner className='size-3.5 text-amber-600 dark:text-amber-400' />,
    },
    paused: {
        label: 'Sync paused',
        tooltip:
            'Connection lost with unsaved changes. They will save when it returns.',
        icon: (
            <WarningIcon
                className='size-3.5 text-amber-600 dark:text-amber-400'
                weight='bold'
            />
        ),
    },
    unreachable: {
        label: 'Offline',
        tooltip: "Can't reach the server. Editing is unavailable until it connects.",
        icon: <WifiSlashIcon className='size-3.5 text-destructive' weight='bold' />,
    },
};

const SAVE_STATUS: Record<
    Exclude<SaveStatus, 'error'>,
    { label: string; dot: string; text?: string; hint?: string }
> = {
    saved: { label: 'Saved', dot: 'bg-green-500' },
    saving: {
        label: 'Saving…',
        dot: 'bg-amber-500 dark:bg-amber-400 animate-pulse',
        text: 'text-amber-800 dark:text-amber-300',
    },
    unsaved: { label: 'Unsaved', dot: 'bg-muted-foreground' },
    empty: { label: 'Empty', dot: 'bg-border', hint: 'Cannot save empty note' },
};

function noteStatusIcon(status: NoteProcessingStatus | undefined): ReactNode {
    switch (status) {
        case 'healthy':
            return (
                <CheckIcon
                    className='size-3.5 text-green-600 dark:text-green-500'
                    weight='bold'
                />
            );
        case 'processing':
            return <Spinner className='size-3.5 text-amber-600 dark:text-amber-400' />;
        case 'warning':
            return (
                <WarningIcon
                    className='size-3.5 text-amber-600 dark:text-amber-400'
                    weight='bold'
                />
            );
        case 'invalid':
            return <XCircleIcon className='size-3.5 text-destructive' weight='bold' />;
        default:
            return <CircleDashedIcon className='size-3.5' weight='bold' />;
    }
}

function Divider() {
    return <span aria-hidden className='mx-2.5 h-3.5 w-px shrink-0 bg-border' />;
}

function Count({
    value,
    total,
    unit,
}: {
    value?: number;
    total: number;
    unit: string;
}) {
    if (value === undefined) {
        return (
            <span>
                <span className='text-foreground'>{total.toLocaleString()}</span> {unit}
            </span>
        );
    }
    return (
        <span className='rounded px-1.5 py-0.5 bg-primary/15'>
            <span className='text-foreground font-medium'>
                {value.toLocaleString()}
            </span>{' '}
            of {total.toLocaleString()} {unit}
        </span>
    );
}

const ISSUE_LABEL: Record<NoteIssueRow['issue']['code'], string> = {
    not_allowed: 'Entry type not allowed in notes',
    unknown_type: 'Unknown entry type',
    missing_entry: 'Linked entry does not exist',
    invalid_value: "Value doesn't fit the entry type",
};

// A save error stays in the footer: the chip opens the full message and the resolve action.
function SaveErrorPopover({
    error,
    onResolve,
}: {
    error?: string | null;
    onResolve?: () => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <button
                        type='button'
                        className='inline-flex h-6 items-center gap-1.5 rounded-sm bg-destructive/10 px-2 font-medium text-destructive cursor-pointer'
                        data-testid='save-status-dot'
                        data-state='error'
                    />
                }
            >
                <WarningIcon className='size-3.5 shrink-0' weight='bold' />
                Not saved
                <CaretUpIcon className={`size-3 ${HIDE_TINY}`} weight='bold' />
            </PopoverTrigger>
            <PopoverContent side='top' align='end' sideOffset={6} className='w-80'>
                <div className='flex items-start gap-2'>
                    <WarningIcon
                        className='size-4 shrink-0 mt-px text-destructive'
                        weight='bold'
                    />
                    <div className='flex min-w-0 flex-col gap-1'>
                        <span className='font-semibold'>Not saved</span>
                        {error && (
                            <span className='break-words text-muted-foreground'>
                                {error}
                            </span>
                        )}
                    </div>
                </div>
                {onResolve && (
                    <div className='flex justify-end border-t border-border pt-2'>
                        <button
                            type='button'
                            onClick={() => {
                                setOpen(false);
                                onResolve();
                            }}
                            className='font-semibold text-foreground underline underline-offset-2 cursor-pointer'
                        >
                            Resolve
                        </button>
                    </div>
                )}
            </PopoverContent>
            <span role='alert' className='sr-only'>
                {error ? `Not saved: ${error}` : 'Not saved'}
            </span>
        </Popover>
    );
}

// An invalid note is saved but not processed; the chip lists its problem links, each
// jumping to where it is.
function NoteIssuesPopover({
    issues,
    onIssueSelect,
}: {
    issues: NoteIssueRow[];
    onIssueSelect: (pos: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const count = `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`;
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <button
                        type='button'
                        className='inline-flex h-6 items-center gap-1.5 rounded-sm bg-destructive/10 px-2 font-medium text-destructive cursor-pointer'
                        aria-label={`Note status: Invalid, ${count}`}
                    />
                }
            >
                <XCircleIcon className='size-3.5 shrink-0' weight='bold' />
                {issues.length}
                <CaretUpIcon className={`size-3 ${HIDE_TINY}`} weight='bold' />
            </PopoverTrigger>
            <PopoverContent side='top' align='end' sideOffset={6} className='w-96'>
                <div className='flex flex-col gap-0.5'>
                    <span className='font-semibold'>Invalid · {count}</span>
                    <span className='text-muted-foreground'>
                        Saved, but its links won't update until these are fixed.
                    </span>
                </div>
                <ul className='-mx-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto'>
                    {issues.map((row, i) => {
                        const content = (
                            <>
                                <WarningIcon
                                    className='size-3.5 shrink-0 mt-px text-destructive'
                                    weight='bold'
                                />
                                <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                                    <span>{ISSUE_LABEL[row.issue.code]}</span>
                                    <span className='truncate font-mono text-muted-foreground'>
                                        {row.text}
                                    </span>
                                </span>
                                {row.line !== null && (
                                    <span className='shrink-0 font-mono text-muted-foreground'>
                                        Ln {row.line}
                                    </span>
                                )}
                            </>
                        );
                        const from = row.from;
                        return (
                            <li
                                key={`${row.issue.key}:${row.issue.value}:${from ?? i}`}
                            >
                                {from === null ? (
                                    <div className='flex items-start gap-2 px-1 py-1.5'>
                                        {content}
                                    </div>
                                ) : (
                                    <button
                                        type='button'
                                        onClick={() => {
                                            setOpen(false);
                                            onIssueSelect(from);
                                        }}
                                        className='flex w-full items-start gap-2 rounded-sm px-1 py-1.5 text-left hover:bg-muted cursor-pointer'
                                    >
                                        {content}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </PopoverContent>
        </Popover>
    );
}

interface EditorStatusBarProps {
    counts: TextCounts;
    selection: TextCounts | null;
    vimMode: VimMode | null;
    liveStatus: SyncIndicator | null;
    saveStatus: SaveStatus;
    saveError?: string | null;
    onSaveErrorClick?: () => void;
    noteStatus?: NoteProcessingStatus;
    noteStatusDescription: string;
    noteStatusIssues: NoteIssueRow[];
    onNoteIssueSelect: (pos: number) => void;
}

export function EditorStatusBar({
    counts,
    selection,
    vimMode,
    liveStatus,
    saveStatus,
    saveError,
    onSaveErrorClick,
    noteStatus,
    noteStatusDescription,
    noteStatusIssues,
    onNoteIssueSelect,
}: EditorStatusBarProps) {
    const live = liveStatus ? LIVE_STATUS[liveStatus] : null;
    return (
        <footer className='@container flex-none border-t border-border text-muted-foreground text-xs font-mono tabular-nums'>
            <div className='flex h-8 items-center justify-between gap-3 pl-2 pr-3'>
                <div className='flex min-w-0 items-center gap-3 whitespace-nowrap'>
                    {vimMode && (
                        <span
                            className={`inline-flex h-[18px] w-15 @max-[28rem]:w-9 shrink-0 items-center justify-center rounded-sm text-[10.5px] font-semibold tracking-wider uppercase ${VIM_MODE_CLASS[vimMode]}`}
                            aria-label={`Vim ${vimMode} mode`}
                        >
                            <span className={HIDE_TINY}>{vimMode}</span>
                            <span className='hidden @max-[28rem]:inline'>
                                {vimMode.slice(0, 3)}
                            </span>
                        </span>
                    )}
                    <span className={HIDE_TINY}>
                        <Count
                            value={selection?.words}
                            total={counts.words}
                            unit='words'
                        />
                    </span>
                    <span className={HIDE_NARROW}>
                        <Count
                            value={selection?.chars}
                            total={counts.chars}
                            unit='chars'
                        />
                    </span>
                </div>

                <div className='flex shrink-0 items-center whitespace-nowrap'>
                    {live && (
                        <span
                            className={`inline-flex items-center ${liveStatus === 'live' ? HIDE_NARROW : ''}`}
                        >
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <span
                                            className='inline-flex items-center gap-1.5 cursor-default'
                                            aria-label={live.label}
                                        />
                                    }
                                >
                                    {live.icon}
                                    <span className={HIDE_TINY}>{live.label}</span>
                                </TooltipTrigger>
                                <TooltipContent>{live.tooltip}</TooltipContent>
                            </Tooltip>
                            <Divider />
                        </span>
                    )}
                    {saveStatus === 'error' ? (
                        <SaveErrorPopover
                            error={saveError}
                            onResolve={onSaveErrorClick}
                        />
                    ) : (
                        <span
                            className='inline-flex items-center gap-1.5'
                            title={SAVE_STATUS[saveStatus].hint}
                            data-testid='save-status-dot'
                            data-state={saveStatus}
                        >
                            <span
                                className={`size-1.5 rounded-full shrink-0 ${SAVE_STATUS[saveStatus].dot}`}
                            />
                            <span className={SAVE_STATUS[saveStatus].text}>
                                {SAVE_STATUS[saveStatus].label}
                            </span>
                        </span>
                    )}
                    <Divider />
                    {noteStatusIssues.length > 0 ? (
                        <NoteIssuesPopover
                            issues={noteStatusIssues}
                            onIssueSelect={onNoteIssueSelect}
                        />
                    ) : (
                        <span
                            className='inline-flex items-center gap-1.5'
                            title={noteStatusDescription}
                            aria-label={noteStatusDescription}
                        >
                            {noteStatusIcon(noteStatus)}
                            <span className={HIDE_TINY}>
                                {formatNoteStatusLabel(noteStatus)}
                            </span>
                        </span>
                    )}
                </div>
            </div>
        </footer>
    );
}
