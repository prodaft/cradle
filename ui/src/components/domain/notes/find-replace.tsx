import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    getSearchQuery,
    replaceAll,
    replaceNext,
    SearchQuery,
    setSearchQuery,
} from '@codemirror/search';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { XIcon } from '@phosphor-icons/react';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    VscArrowDown,
    VscArrowUp,
    VscChevronDown,
    VscChevronRight,
    VscListSelection,
    VscRegex,
    VscReplace,
    VscReplaceAll,
    VscTextSize,
    VscWholeWord,
} from 'react-icons/vsc';

interface FindReplaceProps {
    view: EditorView | null;
    onClose: () => void;
    initialReplace?: boolean;
}

export default function FindReplace({
    view,
    onClose,
    initialReplace = false,
}: FindReplaceProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [replacement, setReplacement] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [isReplaceOpen, setIsReplaceOpen] = useState(initialReplace);

    useEffect(() => {
        if (!view || typeof view.dispatch !== 'function') return;

        const query = new SearchQuery({
            search: searchTerm,
            caseSensitive,
            regexp: useRegex,
            wholeWord,
            replace: replacement,
        });

        view.dispatch({ effects: setSearchQuery.of(query) });
    }, [view, searchTerm, replacement, caseSensitive, useRegex, wholeWord]);

    const findNext = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query) return;

        const cursor = query.getCursor(view.state, view.state.selection.main.to);
        let match = cursor.next();

        if (match.done) {
            match = query.getCursor(view.state).next();
        }

        if (!match.done) {
            view.dispatch({
                selection: { anchor: match.value.from, head: match.value.to },
                scrollIntoView: true,
                effects: EditorView.announce.of(
                    `Match ${match.value.from}-${match.value.to}`,
                ),
            });
        }
    };

    const findPrevious = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query) return;

        const rangeCursor = query.getCursor(
            view.state,
            0,
            view.state.selection.main.from,
        );

        let match = rangeCursor.next();
        let lastMatch: { from: number; to: number } | null = null;
        while (!match.done) {
            lastMatch = match.value;
            match = rangeCursor.next();
        }

        if (lastMatch) {
            view.dispatch({
                selection: {
                    anchor: lastMatch.from,
                    head: lastMatch.to,
                },
                scrollIntoView: true,
                effects: EditorView.announce.of(
                    `Match ${lastMatch.from}-${lastMatch.to}`,
                ),
            });
        } else {
            const allCursor = query.getCursor(view.state);
            let m = allCursor.next();
            let last: { from: number; to: number } | null = null;
            while (!m.done) {
                last = m.value;
                m = allCursor.next();
            }
            if (last) {
                view.dispatch({
                    selection: { anchor: last.from, head: last.to },
                    scrollIntoView: true,
                    effects: EditorView.announce.of(`Match ${last.from}-${last.to}`),
                });
            }
        }
    };

    const selectAllMatches = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query || !searchTerm) return;

        const ranges: { from: number; to: number }[] = [];
        const cursor = query.getCursor(view.state);
        let match = cursor.next();
        while (!match.done) {
            ranges.push(match.value);
            match = cursor.next();
        }

        if (ranges.length > 0) {
            const selections = ranges.map((range) =>
                EditorSelection.range(range.from, range.to),
            );
            view.dispatch({
                selection: EditorSelection.create(selections),
                scrollIntoView: true,
            });
        }
    };

    const replaceOne = () => {
        if (!view || !searchTerm.trim()) return;
        replaceNext(view as never);
    };

    const replaceAllMatches = () => {
        if (!view || !searchTerm.trim()) return;
        replaceAll(view as never);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                findPrevious();
            } else {
                findNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!view || typeof view.dispatch !== 'function') return null;

    return (
        <div className='absolute top-2 right-4 z-50 w-[28rem] bg-card border border-border shadow-lg rounded-md p-2 text-sm'>
            <div className='flex flex-col gap-2'>
                <div className='flex gap-1 items-start'>
                    {/* Toggle Button - h-auto so self-stretch can span the visible rows */}
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        className='h-auto w-6 self-stretch text-foreground hover:bg-secondary hover:text-foreground'
                        onClick={() => setIsReplaceOpen(!isReplaceOpen)}
                        title={isReplaceOpen ? 'Hide replace' : 'Show replace'}
                    >
                        {isReplaceOpen ? (
                            <VscChevronDown className='text-sm' />
                        ) : (
                            <VscChevronRight className='text-sm' />
                        )}
                    </Button>

                    {/* Fields Container */}
                    <div className='flex flex-col gap-2 flex-1 min-w-0'>
                        {/* Find Input */}
                        <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-1 min-w-0'>
                                <InputGroup className='flex-1 min-w-0 bg-muted'>
                                    <InputGroupAddon
                                        align='inline-start'
                                        className='pr-0'
                                    >
                                        <Search
                                            className='size-4 shrink-0 text-muted-foreground'
                                            aria-hidden
                                        />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        type='text'
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={onKeyDown}
                                        placeholder='Find'
                                        className='min-w-0 px-2 py-1.5'
                                        autoFocus
                                    />
                                    <InputGroupAddon align='inline-end'>
                                        <ToggleGroup
                                            multiple
                                            spacing={0}
                                            value={[
                                                ...(caseSensitive ? ['case'] : []),
                                                ...(wholeWord ? ['word'] : []),
                                                ...(useRegex ? ['regex'] : []),
                                            ]}
                                            onValueChange={(values) => {
                                                setCaseSensitive(
                                                    values.includes('case'),
                                                );
                                                setWholeWord(values.includes('word'));
                                                setUseRegex(values.includes('regex'));
                                            }}
                                            size='sm'
                                            className='h-auto p-0'
                                        >
                                            <ToggleGroupItem
                                                value='case'
                                                title='Match Case'
                                                className='size-6 rounded-[calc(var(--radius)-5px)] p-0 text-muted-foreground hover:bg-background hover:text-foreground data-pressed:bg-background data-pressed:text-foreground'
                                            >
                                                <VscTextSize className='text-xs' />
                                            </ToggleGroupItem>
                                            <ToggleGroupItem
                                                value='word'
                                                title='Match Whole Word'
                                                className='size-6 rounded-[calc(var(--radius)-5px)] p-0 text-muted-foreground hover:bg-background hover:text-foreground data-pressed:bg-background data-pressed:text-foreground'
                                            >
                                                <VscWholeWord className='text-xs' />
                                            </ToggleGroupItem>
                                            <ToggleGroupItem
                                                value='regex'
                                                title='Use Regular Expression'
                                                className='size-6 rounded-[calc(var(--radius)-5px)] p-0 text-muted-foreground hover:bg-background hover:text-foreground data-pressed:bg-background data-pressed:text-foreground'
                                            >
                                                <VscRegex className='text-xs' />
                                            </ToggleGroupItem>
                                        </ToggleGroup>
                                    </InputGroupAddon>
                                </InputGroup>
                                <div className='flex gap-0.5 flex-shrink-0'>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={findPrevious}
                                        className='text-foreground hover:bg-secondary hover:text-foreground'
                                        title='Previous match (Shift+Enter)'
                                    >
                                        <VscArrowUp className='text-lg' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={findNext}
                                        className='text-foreground hover:bg-secondary hover:text-foreground'
                                        title='Next match (Enter)'
                                    >
                                        <VscArrowDown className='text-lg' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={selectAllMatches}
                                        className='text-foreground hover:bg-secondary hover:text-foreground'
                                        title='Find All'
                                    >
                                        <VscListSelection className='text-lg' />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={onClose}
                                        className='text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        aria-label='Close'
                                    >
                                        <XIcon size={18} weight='bold' />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Replace Input */}
                        {isReplaceOpen && (
                            <div className='flex flex-col gap-1'>
                                <div className='flex items-center gap-1 min-w-0'>
                                    <Input
                                        type='text'
                                        value={replacement}
                                        onChange={(e) => setReplacement(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                replaceOne();
                                            } else if (e.key === 'Escape') {
                                                onClose();
                                            }
                                        }}
                                        placeholder='Replace'
                                        className='flex-1 bg-muted px-2 py-1.5'
                                    />
                                    <div className='flex gap-0.5 flex-shrink-0'>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={replaceOne}
                                            disabled={!searchTerm.trim()}
                                            className='text-primary hover:bg-secondary hover:text-primary'
                                            title='Replace'
                                        >
                                            <VscReplace className='text-lg' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={replaceAllMatches}
                                            disabled={!searchTerm.trim()}
                                            className='text-primary hover:bg-secondary hover:text-primary'
                                            title='Replace All'
                                        >
                                            <VscReplaceAll className='text-lg' />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
