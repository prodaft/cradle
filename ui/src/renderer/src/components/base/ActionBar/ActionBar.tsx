import TableCard from '@components/base/Card/TableCard';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { Search, Xmark } from 'iconoir-react';
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
      ? 'flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors rounded-full'
      : 'flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full';

  // Many pages rely on icon color toggling based on whether an action is "active" (e.g. selected count > 0).
  const iconWrapperClass = iconActive ? 'text-[#FF8C00]' : 'text-cradle-text-secondary';

  return (
    <Tooltip content={tooltip}>
      <button
        type='button'
        onClick={onClick}
        disabled={disabled}
        className={`${baseClass} ${className}`}
        title={title}
      >
        <span className={iconWrapperClass}>{icon}</span>
        {typeof count === 'number' && count > 0 && (
          <span className='text-sm text-cradle-text-secondary font-mono'>
            {count}
          </span>
        )}
      </button>
    </Tooltip>
  );
});

export const ActionBarDivider = memo(function ActionBarDivider() {
  return <div className='h-8 w-px bg-cradle-border-accent' />;
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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || Boolean(value ?? initialValue));
  const [internalValue, setInternalValue] = useState<string>(value ?? initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep internal state in sync when controlled value changes.
  useEffect(() => {
    if (!isControlled) return;
    setInternalValue(value ?? '');
    setIsExpanded(Boolean(value));
  }, [isControlled, value]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

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

  return (
    <>
      {!isExpanded ? (
        <button
          type='button'
          onClick={() => setIsExpanded(true)}
          className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary rounded-full'
          title='Search'
        >
          <Search className='w-4 h-4' />
        </button>
      ) : (
        <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
          <button
            type='button'
            onClick={submit}
            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
            title='Search'
          >
            <Search className='w-4 h-4' />
          </button>
          <input
            ref={inputRef}
            type='text'
            value={currentValue}
            onChange={(e) => {
              const next = e.target.value;
              // Always update local value immediately to avoid "laggy" controlled inputs when the parent debounces state updates.
              setInternalValue(next);
              debounced?.(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') {
                if (!currentValue) setIsExpanded(false);
              }
            }}
            onBlur={() => {
              if (!currentValue) setIsExpanded(false);
            }}
            placeholder={placeholder}
            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
          />
          {currentValue && (
            <button
              type='button'
              onClick={() => {
                if (!isControlled) setInternalValue('');
                debounced?.cancel();
                onDebouncedChange?.('');
                onClear?.();
                onSubmit?.('');
              }}
              className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
              title='Clear search'
            >
              <Xmark className='w-4 h-4' />
            </button>
          )}
        </div>
      )}
    </>
  );
});

export interface ActionBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export const ActionBar = memo(function ActionBar({ left, right }: ActionBarProps) {
  return (
    <TableCard>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-2 flex-shrink-0'>{left}</div>
        <div className='flex items-center gap-2'>{right}</div>
      </div>
    </TableCard>
  );
});


