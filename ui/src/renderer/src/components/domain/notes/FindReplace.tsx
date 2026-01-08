import {
    getSearchQuery,
    replaceAll,
    replaceNext,
    SearchQuery,
    setSearchQuery,
} from '@codemirror/search';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { VscArrowDown, VscArrowUp, VscChevronDown, VscChevronRight, VscListSelection, VscRegex, VscReplace, VscReplaceAll, VscTextSize, VscWholeWord } from 'react-icons/vsc';
import { Button } from '@/components/ui/button';

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
    const [replaceTerm, setReplaceTerm] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [showReplace, setShowReplace] = useState(initialReplace);

    // Update CodeMirror search query whenever local state changes
    useEffect(() => {
        if (!view) return;

        const query = new SearchQuery({
            search: searchTerm,
            caseSensitive,
            regexp: useRegex,
            wholeWord,
            replace: replaceTerm,
        });

        view.dispatch({ effects: setSearchQuery.of(query) });
    }, [view, searchTerm, replaceTerm, caseSensitive, useRegex, wholeWord]);

    const handleNext = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query) return;

        const cursor = query.getCursor(view.state, view.state.selection.main.to);
        let match = cursor.next();

        if (match.done) {
            // Wrap around
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

    const handlePrevious = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query) return;

        // Search from 0 to current selection start
        // We want the last match in this range.
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
            // Wrap around: find the very last match in the document
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

    const handleFindAll = () => {
        if (!view) return;
        const query = getSearchQuery(view.state);
        if (!query || !searchTerm) return;

        // Get all matches
        const ranges: { from: number; to: number }[] = [];
        const cursor = query.getCursor(view.state);
        let match = cursor.next();
        while (!match.done) {
            ranges.push(match.value);
            match = cursor.next();
        }

        if (ranges.length > 0) {
            // Create multi-selection with all matches
            const selections = ranges.map((range) =>
                EditorSelection.range(range.from, range.to),
            );
            view.dispatch({
                selection: EditorSelection.create(selections),
                scrollIntoView: true,
            });
        }
    };

    const handleReplace = () => {
        if (!view || !searchTerm.trim()) return;
        replaceNext(view);
    };

    const handleReplaceAll = () => {
        if (!view || !searchTerm.trim()) return;
        replaceAll(view);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevious();
            } else {
                handleNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!view) return null;

    return (
        <div className='absolute top-2 right-4 z-50 w-[28rem] bg-card border border-border shadow-lg rounded-md p-2 text-sm'>
            <div className='flex flex-col gap-2'>
                <div className='flex gap-1 items-start'>
                    {/* Toggle Button - Height matches two fields when replace is shown */}
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        className={`w-6 flex-shrink-0 text-foreground hover:bg-secondary hover:text-foreground ${
                            showReplace ? 'self-stretch' : 'h-8 mt-0.5'
                        }`}
                        onClick={() => setShowReplace(!showReplace)}
                    >
                        {showReplace ? <VscChevronDown className="text-sm" /> : <VscChevronRight className="text-sm" />}
                    </Button>

                    {/* Fields Container */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Find Input */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                            <div className="flex-1 min-w-0 bg-muted border border-border rounded-md flex items-center focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Find"
                                    className="flex-1 min-w-0 bg-transparent border-0 outline-none px-2 py-1.5 text-foreground placeholder:text-muted-foreground text-sm"
                                    autoFocus
                                />
                                {/* Options - Inside the input field */}
                                <div className="flex gap-0.5 flex-shrink-0 pr-1">
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setCaseSensitive(!caseSensitive)}
                                        className={`w-6 h-6 ${
                                            caseSensitive
                                                ? 'bg-background text-foreground'
                                                : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                        }`}
                                        title="Match Case"
                                    >
                                        <VscTextSize className="text-xs" />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setWholeWord(!wholeWord)}
                                        className={`w-6 h-6 ${
                                            wholeWord
                                                ? 'bg-bg-background text-text-foreground'
                                                : 'text-muted-foreground hover:bg-bg-background hover:text-text-foreground'
                                        }`}
                                        title="Match Whole Word"
                                    >
                                        <VscWholeWord className="text-xs" />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setUseRegex(!useRegex)}
                                        className={`w-6 h-6 ${
                                            useRegex
                                                ? 'bg-bg-background text-text-foreground'
                                                : 'text-muted-foreground hover:bg-bg-background hover:text-text-foreground'
                                        }`}
                                        title="Use Regular Expression"
                                    >
                                        <VscRegex className="text-xs" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={handlePrevious}
                                    className="w-8 h-8 text-foreground hover:bg-secondary hover:text-foreground"
                                    title="Previous match (Shift+Enter)"
                                >
                                    <VscArrowUp className="text-lg" />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={handleNext}
                                    className="w-8 h-8 text-foreground hover:bg-secondary hover:text-foreground"
                                    title="Next match (Enter)"
                                >
                                    <VscArrowDown className="text-lg" />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={handleFindAll}
                                    className="w-8 h-8 text-foreground hover:bg-secondary hover:text-foreground"
                                    title="Find All"
                                >
                                    <VscListSelection className="text-lg" />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={onClose}
                                    className="w-8 h-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    aria-label="Close"
                                >
                                    <Xmark width="18" height="18" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Replace Input */}
                    {showReplace && (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                                <input
                                    type="text"
                                    value={replaceTerm}
                                    onChange={(e) => setReplaceTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchTerm.trim()) {
                                            handleReplace();
                                        }
                                    }}
                                    placeholder="Replace"
                                    className="flex-1 min-w-0 bg-muted border border-border rounded-md px-2 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground text-sm"
                                />
                                <div className="flex gap-0.5 flex-shrink-0">
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={handleReplace}
                                        disabled={!searchTerm.trim()}
                                        className="w-8 h-8 text-primary hover:bg-muted hover:text-primary"
                                        title="Replace"
                                    >
                                        <VscReplace className="text-lg" />
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={handleReplaceAll}
                                        disabled={!searchTerm.trim()}
                                        className="w-8 h-8 text-primary hover:bg-muted hover:text-primary"
                                        title="Replace All"
                                    >
                                        <VscReplaceAll className="text-lg" />
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
