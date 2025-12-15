import Select, { GroupBase, Props as SelectProps } from 'react-select';
import AsyncSelect, { AsyncProps } from 'react-select/async';

/**
 * Option type for react-select
 */
export interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}

/**
 * Selector component props
 */
export interface SelectorProps<
    Option = SelectOption,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>,
> extends Omit<SelectProps<Option, IsMulti, Group>, 'classNames'> {
    /** Whether multiple options can be selected */
    isMulti?: IsMulti;
    /** Async function to fetch options */
    fetchOptions?: (inputValue: string) => Promise<Option[]>;
    /** Static options array */
    staticOptions?: Option[];
    /** Placeholder text */
    placeholder?: string;
    /** Custom class names */
    classNames?: Partial<SelectProps<Option, IsMulti, Group>['classNames']>;
    /** Menu position strategy */
    menuPosition?: 'fixed' | 'absolute';
    /** Whether to use portal for menu */
    usePortal?: boolean;
}

/**
 * Selector component - Custom styled wrapper around react-select
 *
 * Supports both static options and async loading of options.
 *
 * @example
 * ```tsx
 * // Static options
 * <Selector
 *   staticOptions={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' }
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 *   placeholder="Select an option"
 * />
 *
 * // Async options
 * <Selector
 *   fetchOptions={async (input) => {
 *     const response = await fetch(`/api/search?q=${input}`);
 *     return response.json();
 *   }}
 *   value={selected}
 *   onChange={setSelected}
 *   isMulti
 * />
 * ```
 */
export default function Selector<
    Option = SelectOption,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>,
>({
    isMulti = false as IsMulti,
    fetchOptions,
    staticOptions,
    placeholder = 'Select...',
    value,
    onChange,
    classNames,
    menuPosition = 'fixed',
    usePortal = true,
    ...rest
}: SelectorProps<Option, IsMulti, Group>): JSX.Element {
    const customSelectClassNames = {
        control: (state: any) =>
            [
                'flex min-h-10 items-center rounded-md',
                'cradle-bg-input cradle-border',
                'transition-shadow',
                state.isFocused && 'ring-2 ring-cradle2',
                state.isDisabled && 'opacity-50 cursor-not-allowed',
            ]
                .filter(Boolean)
                .join(' '),

        valueContainer: () =>
            'flex flex-wrap items-center gap-1 px-3 py-1.5',

        placeholder: (state: any) =>
            [
                'text-sm cradle-text-tertiary',
                state.isDisabled && 'cursor-not-allowed',
            ]
                .filter(Boolean)
                .join(' '),

        input: (state: any) =>
            [
                'text-sm cradle-text-primary',
                'm-0 p-0 focus:outline-none',
                state.isDisabled && 'cursor-not-allowed',
            ]
                .filter(Boolean)
                .join(' '),

        singleValue: (state: any) =>
            [
                'text-sm cradle-text-primary',
                state.isDisabled && 'opacity-70',
            ]
                .filter(Boolean)
                .join(' '),

        indicatorsContainer: (state: any) =>
            [
                'flex items-center gap-1 pr-2',
                state.isDisabled && 'opacity-50',
            ]
                .filter(Boolean)
                .join(' '),

        menu: () =>
            [
                'mt-1 rounded-md',
                'cradle-bg-elevated cradle-border',
                'shadow-lg',
            ].join(' '),

        menuPortal: () => 'z-[9999]',

        menuList: () => 'p-1',

        option: (state: any) =>
            [
                'cursor-pointer rounded-sm px-3 py-2 text-sm',
                'cradle-text-secondary',
                state.isFocused && 'bg-cradle-accent-primary/10',
                state.isSelected && 'bg-cradle2/20 cradle-text-primary',
                state.isDisabled && 'opacity-50 cursor-not-allowed',
            ]
                .filter(Boolean)
                .join(' '),

        multiValue: () =>
            'flex items-center rounded-sm bg-cradle2/20',

        multiValueLabel: () =>
            'px-2 py-0.5 text-sm cradle-text-primary',

        multiValueRemove: () =>
            [
                'px-1 cursor-pointer rounded-sm',
                'cradle-text-secondary hover:cradle-text-primary hover:bg-cradle-hover',
            ].join(' '),

        noOptionsMessage: () =>
            'px-3 py-2 text-sm cradle-text-tertiary',

        loadingMessage: () =>
            'px-3 py-2 text-sm cradle-text-tertiary',
    };


    // Common props for both Select and AsyncSelect
    const commonProps = {
        value,
        onChange,
        isMulti,
        placeholder,
        menuPosition,
        unstyled: true,
        classNames: customSelectClassNames,
        ...(usePortal && { menuPortalTarget: document.body }),
        ...rest,
    } as const;

    if (fetchOptions) {
        return (
            <AsyncSelect<Option, IsMulti, Group>
                loadOptions={fetchOptions}
                defaultOptions={staticOptions || true}
                {...(commonProps as AsyncProps<Option, IsMulti, Group>)}
            />
        );
    }

    return (
        <Select<Option, IsMulti, Group>
            options={staticOptions || []}
            {...(commonProps as SelectProps<Option, IsMulti, Group>)}
        />
    );
}
