import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { debounce } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

type ActionBarButtonVariant = 'circle' | 'pill';

interface ActionBarButtonProps {
    tooltip: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    /** Optional count badge (shown when > 0) */
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
    /** Called immediately when user submits (Enter / search button). */
    onSubmit?: (value: string) => void;
    /** Called immediately when the user clears the search. */
    onClear?: () => void;
}

export const ActionBarSearch = memo(function ActionBarSearch({
    placeholder,
    value,
    initialValue = '',
    debounceMs = 250,
    onDebouncedChange,
    onSubmit,
}: ActionBarSearchProps) {
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

    const submit = useCallback(() => {
        debounced?.flush?.();
        debounced?.cancel?.();
        onSubmit?.(currentValue);
    }, [onSubmit, currentValue, debounced]);

    return (
        <Input
            placeholder={placeholder}
            value={currentValue}
            onChange={(e) => {
                const next = e.target.value;
                setInternalValue(next);
                debounced?.(next);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
            }}
            className='h-8 w-40 lg:w-56'
        />
    );
});
