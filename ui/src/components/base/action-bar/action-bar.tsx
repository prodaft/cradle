import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { debounce } from 'lodash';
import React, {
    memo,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useState,
    type HTMLInputTypeAttribute,
} from 'react';

type ActionBarButtonVariant = 'circle' | 'pill';

interface ActionBarButtonProps {
    tooltip: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    count?: number;
    variant?: ActionBarButtonVariant;
    icon: React.ReactNode;
    iconActive?: boolean;
    className?: string;
    title?: string;
}

export const ActionBarButton = memo(function ActionBarButton({
    tooltip,
    onClick,
    disabled,
    count,
    variant = 'pill',
    icon,
    iconActive = false,
    className = '',
    title,
}: ActionBarButtonProps) {
    const iconWrapperClass = iconActive ? 'text-primary' : 'text-muted-foreground';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type='button'
                    onClick={onClick}
                    disabled={disabled}
                    variant='outline'
                    size={variant === 'circle' ? 'icon' : 'default'}
                    className={className}
                    title={title}
                >
                    <span className={iconWrapperClass}>{icon}</span>
                    {typeof count === 'number' && count > 0 && (
                        <span className='text-sm text-foreground font-mono'>
                            {count}
                        </span>
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
});

interface ActionBarSearchProps {
    placeholder: string;
    /**
     * Controlled value (optional). If provided, the input will sync to it.
     * Keep this stable to avoid unnecessary re-renders.
     */
    value?: string;
    /** Initial value for uncontrolled mode. */
    initialValue?: string;
    /** Debounce delay (ms) for onDebouncedChange. */
    debounceMs?: number;
    /** Called (debounced) as the user types. */
    onDebouncedChange?: (value: string) => void;
    /** Called on every change, before debouncing. */
    onValueChange?: (value: string) => void;
    /** Called immediately when user submits (Enter / search button). */
    onSubmit?: (value: string) => void;
    /** Called when the input becomes empty after user input. */
    onClear?: () => void;
    /** `id` on the input (defaults to a unique `useId()`). */
    id?: string;
    /** `name` on the input (for autofill / form semantics). */
    name?: string;
    /** Classes on the root `relative` wrapper around the input and icon. */
    className?: string;
    /** Extra classes for the `<Input>` only. */
    inputClassName?: string;
    type?: HTMLInputTypeAttribute;
    disabled?: boolean;
}

export const ActionBarSearch = memo(function ActionBarSearch({
    placeholder,
    value,
    initialValue = '',
    debounceMs = 250,
    onDebouncedChange,
    onValueChange,
    onSubmit,
    onClear,
    id: idProp,
    name = 'action-bar-search',
    className,
    inputClassName,
    type = 'text',
    disabled,
}: ActionBarSearchProps) {
    const generatedId = useId();
    const inputId = idProp ?? generatedId;
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(value ?? initialValue);

    // Keep internal state in sync when controlled value changes.
    useEffect(() => {
        if (!isControlled) return;
        setInternalValue(value ?? '');
    }, [isControlled, value]);

    const debounced = useMemo(() => {
        if (!onDebouncedChange) return null;
        return debounce((next: string) => onDebouncedChange(next), debounceMs);
    }, [onDebouncedChange, debounceMs]);

    useEffect(() => {
        return () => {
            debounced?.cancel();
        };
    }, [debounced]);

    const currentValue = internalValue;

    const flushAndSubmit = useCallback(
        (liveValue: string) => {
            debounced?.flush?.();
            debounced?.cancel?.();
            onSubmit?.(liveValue);
        },
        [onSubmit, debounced],
    );

    const handleChange = (next: string) => {
        setInternalValue(next);
        onValueChange?.(next);
        if (next === '') onClear?.();
        debounced?.(next);
    };

    const input = (
        <Input
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            placeholder={placeholder}
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    flushAndSubmit((e.target as HTMLInputElement).value);
                }
            }}
            className={cn('h-8 w-full min-w-0 pl-9', inputClassName)}
        />
    );

    return (
        <div className={cn('relative', className ?? 'w-40 lg:w-56')}>
            <span
                className='pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground'
                aria-hidden
            >
                <MagnifyingGlassIcon className='h-4 w-4' weight='bold' />
            </span>
            {input}
        </div>
    );
});
