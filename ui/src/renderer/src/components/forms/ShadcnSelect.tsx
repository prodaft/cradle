import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}

export interface ShadcnSelectProps<T = string | number> {
    /** Static options array */
    staticOptions?: SelectOption<T>[];
    /** Async function to fetch options */
    fetchOptions?: (inputValue: string) => Promise<SelectOption<T>[]>;
    /** Current value (for single select) */
    value?: SelectOption<T> | null;
    /** Current values (for multi select) */
    values?: SelectOption<T>[];
    /** Change handler (for single select) */
    onChange?: (value: SelectOption<T> | null) => void;
    /** Change handler (for multi select) */
    onMultiChange?: (values: SelectOption<T>[]) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the select is disabled */
    isDisabled?: boolean;
    disabled?: boolean;
    /** Whether multiple options can be selected */
    isMulti?: boolean;
    /** Whether the select is clearable */
    isClearable?: boolean;
    /** Custom className */
    className?: string;
    /** Width class */
    width?: string;
}

/**
 * ShadcnSelect - Wrapper around shadcn Select component
 * Supports both static and async options, single and multi-select
 */
export default function ShadcnSelect<T = string | number>({
    staticOptions = [],
    fetchOptions,
    value,
    values,
    onChange,
    onMultiChange,
    placeholder = 'Select...',
    disabled = false,
    isDisabled = false,
    isMulti = false,
    isClearable = false,
    className,
    width = 'w-full',
}: ShadcnSelectProps<T>): JSX.Element {
    const [asyncOptions, setAsyncOptions] = React.useState<SelectOption<T>[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');

    const isFieldDisabled = disabled || isDisabled;

    // Load async options on mount and when search term changes
    React.useEffect(() => {
        if (fetchOptions) {
            setIsLoading(true);
            fetchOptions(searchTerm)
                .then((results) => {
                    setAsyncOptions(results);
                    setIsLoading(false);
                })
                .catch(() => {
                    setIsLoading(false);
                });
        }
    }, [fetchOptions, searchTerm]);

    const availableOptions = fetchOptions ? asyncOptions : staticOptions;

    // Multi-select implementation
    if (isMulti) {
        const selectedValues = values || [];
        const selectedValueSet = new Set(selectedValues.map(v => v.value?.toString()));

        const handleToggle = (option: SelectOption<T>) => {
            const isSelected = selectedValueSet.has(option.value?.toString());
            if (isSelected) {
                onMultiChange?.(selectedValues.filter(v => v.value?.toString() !== option.value?.toString()));
            } else {
                onMultiChange?.([...selectedValues, option]);
            }
        };

        const handleRemove = (option: SelectOption<T>) => {
            onMultiChange?.(selectedValues.filter(v => v.value?.toString() !== option.value?.toString()));
        };

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(width, "justify-between min-h-10 h-auto", className)}
                        disabled={isFieldDisabled}
                    >
                        <div className="flex flex-wrap gap-1 flex-1">
                            {selectedValues.length === 0 ? (
                                <span className="text-muted-foreground">{placeholder}</span>
                            ) : (
                                selectedValues.map((option) => (
                                    <Badge
                                        key={option.value?.toString()}
                                        variant="secondary"
                                        className="mr-1 mb-1"
                                    >
                                        {option.label}
                                        <button
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRemove(option);
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={() => handleRemove(option)}
                                        >
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn(width, "p-0")} align="start">
                    <div className="p-2">
                        {fetchOptions && (
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mb-2"
                            />
                        )}
                        <div className="max-h-[300px] overflow-y-auto">
                            {isLoading && availableOptions.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                            ) : availableOptions.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">No options found.</div>
                            ) : (
                                availableOptions.map((option) => {
                                    const isSelected = selectedValueSet.has(option.value?.toString());
                                    return (
                                        <div
                                            key={option.value?.toString()}
                                            className={cn(
                                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                isSelected && "bg-accent"
                                            )}
                                            onClick={() => handleToggle(option)}
                                        >
                                            <div
                                                className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}
                                            >
                                                <Check className="h-4 w-4" />
                                            </div>
                                            {option.label}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // Single-select implementation
    const selectedValue = value?.value?.toString() || '';

    const handleValueChange = (newValue: string) => {
        if (newValue === '') {
            onChange?.(null);
            return;
        }
        const option = availableOptions.find((opt) => opt.value?.toString() === newValue);
        onChange?.(option || null);
    };

    return (
        <Select
            value={selectedValue}
            onValueChange={handleValueChange}
            disabled={isFieldDisabled || isLoading}
        >
            <SelectTrigger className={cn(width, className)}>
                <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {isLoading && availableOptions.length === 0 ? (
                    <SelectItem value="__loading__" disabled>
                        Loading...
                    </SelectItem>
                ) : availableOptions.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                        No options available
                    </SelectItem>
                ) : (
                    availableOptions.map((option) => (
                        <SelectItem
                            key={option.value?.toString()}
                            value={option.value?.toString() || ''}
                        >
                            {option.label}
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    );
}
