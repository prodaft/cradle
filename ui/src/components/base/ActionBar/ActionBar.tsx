import { Button } from '@/components/ui/button';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MoreHoriz, Search, Xmark } from 'iconoir-react';
import { debounce } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ActionBarButtonVariant = 'circle' | 'pill';

export interface ActionBarButtonProps {
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
    const baseClass =
        variant === 'circle'
            ? 'flex items-center justify-center w-10 h-10 border border-border bg-transparent hover:bg-secondary hover:text-foreground transition-colors rounded-lg'
            : 'flex items-center gap-2 px-3 h-10 border border-border bg-transparent hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';

    // Many pages rely on icon color toggling based on whether an action is "active" (e.g. selected count > 0).
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

export interface ActionBarSearchProps {
    placeholder: string;
    /**
     * Controlled value (optional). If provided, the input will sync to it.
     * Keep this stable to avoid unnecessary re-renders.
     */
    value?: string;
    /** Initial value for uncontrolled mode. */
    initialValue?: string;
    /** Whether the search input should start expanded. */
    defaultExpanded?: boolean;
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
    defaultExpanded = false,
    debounceMs = 250,
    onDebouncedChange,
    onSubmit,
    onClear,
}: ActionBarSearchProps) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(value ?? initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Always render from internalValue so typing stays responsive even if the parent-controlled value lags.
    // When controlled, we still sync internalValue from `value` via the effect above.
    const currentValue = internalValue;

    const submit = useCallback(() => {
        // If the user submits (Enter / button), apply any pending debounced change immediately, then cancel
        // the timer so it doesn't fire again afterwards.
        debounced?.flush?.();
        debounced?.cancel?.();
        onSubmit?.(currentValue);
    }, [onSubmit, currentValue, debounced]);

    const handleClear = useCallback(() => {
        if (!isControlled) setInternalValue('');
        debounced?.cancel();
        onDebouncedChange?.('');
        onClear?.();
        onSubmit?.('');
    }, [isControlled, debounced, onDebouncedChange, onClear, onSubmit]);

    return (
        <InputGroup className='min-w-[280px]'>
            <InputGroupInput
                ref={inputRef}
                placeholder={placeholder}
                value={currentValue}
                onChange={(e) => {
                    const next = e.target.value;
                    // Always update local value immediately to avoid "laggy" controlled inputs when the parent debounces state updates.
                    setInternalValue(next);
                    debounced?.(next);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                }}
            />
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            {currentValue && (
                <InputGroupAddon
                    align='inline-end'
                    onClick={handleClear}
                    className='cursor-pointer'
                >
                    <Xmark />
                </InputGroupAddon>
            )}
        </InputGroup>
    );
});

export interface ActionBarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
}

export const ActionBar = memo(function ActionBar({ left, right }: ActionBarProps) {
    return (
        <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-2 flex-shrink-0'>{left}</div>
            <div className='flex items-center gap-2'>{right}</div>
        </div>
    );
});

export interface CollapsibleAction {
    /** Unique identifier for the action */
    id: string;
    /** Tooltip text */
    tooltip: React.ReactNode;
    /** Icon to display */
    icon: React.ReactNode;
    /** Click handler */
    onClick: () => void;
    /** Whether the action is disabled */
    disabled?: boolean;
    /** Whether the icon should be highlighted as active */
    iconActive?: boolean;
    /** If true, this action is never collapsed (e.g., "add" actions) */
    alwaysVisible?: boolean;
}

export interface CollapsibleActionGroupProps {
    /** Array of action configurations */
    actions: CollapsibleAction[];
    /** Number of currently selected items (used for display and enabling expand) */
    selectedCount: number;
    /** Label for items (e.g., "note", "file") */
    itemLabel?: string;
}

/**
 * CollapsibleActionGroup - A group of action buttons that collapses into a MoreHoriz button
 *
 * Features:
 * - Shows MoreHoriz button when collapsed (with selected count)
 * - Expands to show all actions when clicked
 * - Collapse enabled when there are 2+ collapsible actions
 * - Only allows opening if more than 1 item is selected
 * - Actions marked with `alwaysVisible` are never collapsed
 * - MoreHoriz button stays visible when expanded (click to collapse)
 * - Animated expand/collapse transitions
 */
export const CollapsibleActionGroup = memo(function CollapsibleActionGroup({
    actions,
    selectedCount,
    itemLabel = 'item',
}: CollapsibleActionGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Separate always-visible actions from collapsible ones
    const alwaysVisibleActions = actions.filter((a) => a.alwaysVisible);
    const collapsibleActions = actions.filter((a) => !a.alwaysVisible);

    // Collapse is available when there are 2+ collapsible actions
    const shouldCollapse = collapsibleActions.length >= 2;
    // Can expand if at least 1 item is selected
    const canExpand = selectedCount >= 1 && shouldCollapse;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleActionClick = (action: CollapsibleAction) => {
        setIsExpanded(false);
        action.onClick();
    };

    // Circle button style (perfect circle)
    const circleButtonClass =
        'flex items-center justify-center w-10 h-10 border border-border bg-transparent hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';

    // Pill button style (for MoreHoriz with count)
    const pillButtonClass =
        'flex items-center justify-center gap-2 px-3 h-10 border border-border bg-transparent hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';

    const renderActionButton = (
        action: CollapsibleAction,
        animated = false,
        animationIndex = 0,
    ) => {
        const button = (
            <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                    <Button
                        type='button'
                        onClick={() => handleActionClick(action)}
                        disabled={action.disabled}
                        variant='outline'
                        size='icon'
                    >
                        <span
                            className={
                                action.iconActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                            }
                        >
                            {action.icon}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{action.tooltip}</TooltipContent>
            </Tooltip>
        );

        if (animated) {
            return (
                <div
                    key={action.id}
                    className='animate-actions-fade-in-right'
                    style={{ animationDelay: `${animationIndex * 30}ms` }}
                >
                    {button}
                </div>
            );
        }

        return button;
    };

    const renderCollapsibleActions = () => {
        if (!shouldCollapse) {
            // No collapse needed - show all actions directly
            return collapsibleActions.map((action) => renderActionButton(action));
        }

        // MoreHoriz button (always visible when collapsible)
        const moreButton = (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type='button'
                        onClick={() => {
                            if (canExpand) {
                                setIsExpanded(!isExpanded);
                            }
                        }}
                        disabled={!canExpand}
                        variant='outline'
                        size={selectedCount > 0 ? 'default' : 'icon'}
                    >
                        <MoreHoriz
                            className={`w-5 h-5 ${selectedCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                        {selectedCount > 0 && (
                            <span className='text-sm text-foreground font-mono'>
                                {selectedCount}
                            </span>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {!canExpand
                        ? `Select ${itemLabel}s to see actions`
                        : isExpanded
                          ? 'Collapse actions'
                          : `${collapsibleActions.length} actions available`}
                </TooltipContent>
            </Tooltip>
        );

        if (!isExpanded) {
            // Collapsed state: show only MoreHoriz button
            return moreButton;
        }

        // Expanded state: show MoreHoriz + all action buttons with animation
        return (
            <>
                {moreButton}
                {collapsibleActions.map((action, index) =>
                    renderActionButton(action, true, index),
                )}
            </>
        );
    };

    return (
        <div ref={containerRef} className='flex items-center gap-2'>
            {/* Always-visible actions come first */}
            {alwaysVisibleActions.map((action) => renderActionButton(action))}

            {/* Collapsible actions */}
            {renderCollapsibleActions()}
        </div>
    );
});
