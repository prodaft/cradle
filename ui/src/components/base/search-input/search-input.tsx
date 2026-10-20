import { SearchSyntaxHelp } from '@/components/base/search-input/search-syntax-help';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type HighlightKind, tokenizeForHighlight } from '@/lib/search-query/highlight';
import {
    type SearchSchema,
    type SearchState,
    formatSearch,
    parseSearch,
    recognizedKeys,
} from '@/lib/search-query/search-schema';
import {
    type Suggestion,
    type SuggestionKind,
    applySuggestion,
    getSuggestions,
} from '@/lib/search-query/suggest';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import {
    type KeyboardEvent,
    memo,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

// Syntax-highlighted, autocompleting search bar. A
// real (but text-transparent) <Input> handles typing/focus/selection, with an aria-hidden,
// pointer-events-none overlay on top painting the same text as colored spans, plus a suggestion
// dropdown for the qualifier/keyword/value at the cursor.
//
// The page owns the *applied* SearchState (usually derived from URL params); this component owns
// the draft text. Typing only edits the draft; the search runs on Enter (or the clear button),
// and only if the draft parses -- otherwise Enter shows the parse error until the next edit.
//
// The overlay is two nested boxes: the outer one owns padding/border and never scrolls, the
// inner one has its scrollLeft mirrored from the real input's, so long text scrolls exactly like
// the native input's text region while the icon gutters stay put.

const HIGHLIGHT_CLASS_NAME: Record<HighlightKind, string> = {
    space: '',
    word: '',
    paren: 'text-muted-foreground',
    keyword: 'font-semibold text-blue-600 dark:text-blue-400',
    phrase: 'text-emerald-600 dark:text-emerald-400',
    exact: 'text-cyan-600 dark:text-cyan-400',
    wildcard: 'text-amber-600 dark:text-amber-400',
    qualifier: 'text-violet-600 dark:text-violet-400',
};

const SUGGESTION_KIND_CLASS_NAME: Record<SuggestionKind, string> = {
    qualifier: HIGHLIGHT_CLASS_NAME.qualifier,
    keyword: HIGHLIGHT_CLASS_NAME.keyword,
    value: HIGHLIGHT_CLASS_NAME.phrase,
};

const BOX_CLASSES = 'h-8 pl-9 pr-14 text-xs';

interface SearchInputProps {
    schema: SearchSchema;
    value: SearchState;
    onApply: (state: SearchState) => void;
    placeholder: string;
    className?: string;
    disabled?: boolean;
}

export const SearchInput = memo(function SearchInput({
    schema,
    value,
    onApply,
    placeholder,
    className,
    disabled,
}: SearchInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();
    const appliedText = formatSearch(value, schema);
    const [draft, setDraft] = useState(appliedText);
    const [cursor, setCursor] = useState(0);
    const [focused, setFocused] = useState(false);
    const [escaped, setEscaped] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [browsing, setBrowsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const draftRef = useRef(draft);
    draftRef.current = draft;
    const syncedTextRef = useRef(appliedText);
    useEffect(() => {
        if (appliedText === syncedTextRef.current) return;
        syncedTextRef.current = appliedText;
        const current = parseSearch(draftRef.current, schema);
        if (!current.ok || formatSearch(current.state, schema) !== appliedText) {
            setDraft(appliedText);
            setError(null);
        }
    }, [appliedText, schema]);

    function apply(text: string) {
        const result = parseSearch(text, schema);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        const formatted = formatSearch(result.state, schema);
        if (formatted === appliedText) return;
        syncedTextRef.current = formatted;
        onApply(result.state);
    }

    const qualifierKeys = useMemo(() => recognizedKeys(schema), [schema]);
    const suggestions = useMemo(
        () => getSuggestions(draft, cursor, schema),
        [draft, cursor, schema],
    );
    const open = focused && !escaped && suggestions.length > 0;
    const safeActiveIndex = Math.min(activeIndex, suggestions.length - 1);

    useEffect(() => {
        let frame: number;
        const tick = () => {
            const input = inputRef.current;
            const overlay = overlayRef.current;
            if (input && overlay && overlay.scrollLeft !== input.scrollLeft) {
                overlay.scrollLeft = input.scrollLeft;
            }
            if (focused) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [focused, draft]);

    function change(next: string) {
        setDraft(next);
        setEscaped(false);
        setBrowsing(false);
        setError(null);
    }

    function accept(suggestion: Suggestion) {
        const result = applySuggestion(draft, cursor, suggestion);
        change(result.value);
        setCursor(result.cursor);
        setActiveIndex(0);
        requestAnimationFrame(() => {
            inputRef.current?.setSelectionRange(result.cursor, result.cursor);
            inputRef.current?.focus();
        });
    }

    function clear() {
        change('');
        apply('');
        inputRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (open) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setBrowsing(true);
                setActiveIndex((i) => (i + 1) % suggestions.length);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setBrowsing(true);
                setActiveIndex(
                    (i) => (i - 1 + suggestions.length) % suggestions.length,
                );
                return;
            }
            const typing = cursor > 0 && !/\s/.test(draft[cursor - 1]!);
            if (event.key === 'Tab' && (typing || browsing)) {
                event.preventDefault();
                accept(suggestions[safeActiveIndex]!);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setEscaped(true);
                return;
            }
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            apply(draft);
            setEscaped(true);
        }
    }

    return (
        <div className={cn('relative', className ?? 'min-w-40 flex-1')}>
            <span
                className='pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground'
                aria-hidden
            >
                <MagnifyingGlassIcon className='h-4 w-4' weight='bold' />
            </span>
            <Input
                ref={inputRef}
                value={draft}
                onChange={(event) => {
                    change(event.target.value);
                    setCursor(event.target.selectionStart ?? event.target.value.length);
                }}
                onSelect={(event) => {
                    const target = event.currentTarget;
                    setCursor(target.selectionStart ?? target.value.length);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    setFocused(true);
                    setBrowsing(false);
                }}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={placeholder}
                aria-invalid={error ? true : undefined}
                role='combobox'
                aria-autocomplete='list'
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={
                    open ? `${listboxId}-${safeActiveIndex}` : undefined
                }
                spellCheck={false}
                autoComplete='off'
                className={cn(BOX_CLASSES, 'text-transparent caret-foreground')}
            />
            <div
                aria-hidden
                className={cn(
                    // z-0 so leading/trailing icons (z-10) always paint above the overlay.
                    'pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden border border-transparent py-1',
                    BOX_CLASSES,
                )}
            >
                <div
                    ref={overlayRef}
                    className='min-w-0 flex-1 overflow-hidden whitespace-pre'
                >
                    {tokenizeForHighlight(draft, qualifierKeys).map((span, index) => (
                        <span key={index} className={HIGHLIGHT_CLASS_NAME[span.kind]}>
                            {span.text}
                        </span>
                    ))}
                </div>
            </div>
            <div className='absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center'>
                {draft && !disabled && (
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        aria-label='Clear search'
                        className='text-muted-foreground'
                        onClick={clear}
                    >
                        <XIcon />
                    </Button>
                )}
                <SearchSyntaxHelp schema={schema} />
            </div>
            {error && focused && !open && (
                <p
                    role='alert'
                    className='absolute top-full left-0 z-50 mt-1 w-full border border-destructive/40 bg-popover px-2.5 py-1.5 text-xs text-destructive shadow-md'
                >
                    {error}
                </p>
            )}
            {open && (
                <div
                    id={listboxId}
                    role='listbox'
                    className='absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-auto border bg-popover text-popover-foreground shadow-md'
                >
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={`${suggestion.kind}-${suggestion.label}`}
                            id={`${listboxId}-${index}`}
                            role='option'
                            aria-selected={index === safeActiveIndex}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => accept(suggestion)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                                'flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 text-xs',
                                index === safeActiveIndex
                                    ? 'bg-muted'
                                    : 'hover:bg-muted/50',
                            )}
                        >
                            <span
                                className={cn(
                                    'font-mono',
                                    SUGGESTION_KIND_CLASS_NAME[suggestion.kind],
                                )}
                            >
                                {suggestion.label}
                            </span>
                            {suggestion.description && (
                                <span className='truncate text-muted-foreground'>
                                    {suggestion.description}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
