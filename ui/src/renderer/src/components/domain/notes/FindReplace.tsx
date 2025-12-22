import {
    getSearchQuery,
    replaceAll,
    replaceNext,
    SearchQuery,
    setSearchQuery
} from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import { NavArrowDown, NavArrowUp, Xmark } from 'iconoir-react';
import { useEffect, useState } from 'react';

interface FindReplaceProps {
    view: EditorView | null;
    onClose: () => void;
    initialReplace?: boolean;
}

export default function FindReplace({ view, onClose, initialReplace = false }: FindReplaceProps) {
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
                    effects: EditorView.announce.of(
                        `Match ${last.from}-${last.to}`,
                    ),
                });
            }
        }
    };

    const handleReplace = () => {
        if (view) replaceNext(view);
    };

    const handleReplaceAll = () => {
        if (view) replaceAll(view);
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
        <div className="absolute top-2 right-4 z-50 w-80 bg-cradle-bg-primary border cradle-border shadow-lg rounded-lg p-3 text-sm">
            <div className="flex flex-col gap-2">
                {/* Header / Toggle Replace */}
                <div className="flex items-center justify-between mb-1">
                    <button
                        className="text-xs cradle-text-secondary hover:cradle-text-primary flex items-center gap-1"
                        onClick={() => setShowReplace(!showReplace)}
                    >
                        <span className={`transition-transform ${showReplace ? 'rotate-90' : ''}`}>▶</span>
                        {showReplace ? 'Find & Replace' : 'Find'}
                    </button>
                    <button
                        onClick={onClose}
                        className="cradle-text-tertiary hover:cradle-text-primary p-1"
                        aria-label="Close"
                    >
                        <Xmark width="16" height="16" />
                    </button>
                </div>

                {/* Find Input */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Find"
                            className="cradle-search flex-1 bg-cradle-bg-secondary border cradle-border rounded px-2 py-1 outline-none focus:border-[#FF8C00] text-cradle-text-primary"
                            autoFocus
                        />
                        <div className="flex gap-0.5">
                            <button
                                onClick={handlePrevious}
                                className="p-1 cradle-text-secondary hover:bg-cradle-bg-secondary rounded hover:text-[#FF8C00]"
                                title="Previous match (Shift+Enter)"
                            >
                                <NavArrowUp width="18" height="18" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="p-1 cradle-text-secondary hover:bg-cradle-bg-secondary rounded hover:text-[#FF8C00]"
                                title="Next match (Enter)"
                            >
                                <NavArrowDown width="18" height="18" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Replace Input */}
                {showReplace && (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={replaceTerm}
                                onChange={(e) => setReplaceTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleReplace();
                                    }
                                }}
                                placeholder="Replace"
                                className="cradle-search flex-1 bg-cradle-bg-secondary border cradle-border rounded px-2 py-1 outline-none focus:border-[#FF8C00] text-cradle-text-primary"
                            />
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                            <button
                                onClick={handleReplace}
                                className="px-3 py-1 bg-cradle-bg-secondary border cradle-border rounded text-xs hover:border-[#FF8C00] cradle-text-secondary hover:cradle-text-primary"
                            >
                                Replace
                            </button>
                            <button
                                onClick={handleReplaceAll}
                                className="px-3 py-1 bg-cradle-bg-secondary border cradle-border rounded text-xs hover:border-[#FF8C00] cradle-text-secondary hover:cradle-text-primary"
                            >
                                Replace All
                            </button>
                        </div>
                    </div>
                )}

                {/* Options */}
                <div className="flex items-center gap-4 mt-1 px-1">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group" title="Match Case">
                        <input
                            type="checkbox"
                            checked={caseSensitive}
                            onChange={(e) => setCaseSensitive(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-400 text-[#FF8C00] focus:ring-[#FF8C00] bg-transparent"
                        />
                        <span className="text-xs cradle-text-tertiary group-hover:cradle-text-secondary">Aa</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group" title="Match Whole Word">
                        <input
                            type="checkbox"
                            checked={wholeWord}
                            onChange={(e) => setWholeWord(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-400 text-[#FF8C00] focus:ring-[#FF8C00] bg-transparent"
                        />
                        <span className="text-xs cradle-text-tertiary group-hover:cradle-text-secondary">\b</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group" title="Use Regular Expression">
                        <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-400 text-[#FF8C00] focus:ring-[#FF8C00] bg-transparent"
                        />
                        <span className="text-xs cradle-text-tertiary group-hover:cradle-text-secondary">.*</span>
                    </label>
                </div>
            </div>
        </div>
    );
}