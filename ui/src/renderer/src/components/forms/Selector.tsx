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
            `input input-block min-h-[2.5rem] !p-0 ${state.isFocused ? 'ring-1 ring-cradle2' : ''} ${state.isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`,
        valueContainer: () => 'px-4 gap-1 flex items-center',
        placeholder: (state: any) =>
            `text-gray-500 dark:text-gray-400 ${state.isDisabled ? 'cursor-not-allowed' : ''}`,
        input: (state: any) =>
            `text-inherit m-0 p-0 ${state.isDisabled ? 'cursor-not-allowed' : ''}`,
        singleValue: (state: any) =>
            `text-inherit ${state.isDisabled ? 'opacity-70' : ''}`,
        indicatorsContainer: (state: any) =>
            `pr-2 ${state.isDisabled ? 'opacity-50' : ''}`,
        menu: () =>
            'cradle-bg-elevated cradle-border rounded-md mt-1 shadow-lg z-[9999]',
        menuPortal: () => 'z-[9999]',
        menuList: () => 'p-1',
        option: (state: any) =>
            `px-3 py-2 text-sm cradle-text-secondary rounded-sm cursor-pointer ${
                state.isFocused ? 'cradle-border border-[#FF8C00] bg-opacity-50' : ''
            } ${state.isSelected ? 'bg-cradle2 bg-opacity-20' : ''}`,
        multiValue: () => 'bg-cradle2 bg-opacity-30 rounded-sm',
        multiValueLabel: () => 'cradle-text-primary text-sm px-2 py-0.5',
        multiValueRemove: () =>
            'cradle-text-secondary hover:cradle-text-primary hover:bg-opacity-50 px-1 cursor-pointer',
        noOptionsMessage: () => 'cradle-text-secondary text-sm py-2',
        loadingMessage: () => 'cradle-text-secondary text-sm py-2',
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
