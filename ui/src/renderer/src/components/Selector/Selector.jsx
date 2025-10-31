import Select from 'react-select';
import AsyncSelect from 'react-select/async';

const Selector = ({
    isMulti = false,
    fetchOptions,
    staticOptions,
    placeholder = 'Select...',
    value,
    onChange,
    classNames,
    menuPosition = 'fixed',
    usePortal = true,
    ...rest
}) => {
    const customSelectClassNames = {
        control: (state) =>
            `input input-block min-h-[2.5rem] !p-0 ${state.isFocused ? 'ring-2 ring-cradle2' : ''
            }`,
        valueContainer: () => 'px-4 gap-1 flex items-center',
        placeholder: () => 'text-gray-500 dark:text-gray-400',
        input: () => 'text-inherit m-0 p-0',
        singleValue: () => 'text-inherit',
        indicatorsContainer: () => 'pr-2',
        menu: () =>
            'cradle-bg-elevated cradle-border rounded-md mt-1 shadow-lg z-[9999]',
        menuPortal: () => 'z-[9999]',
        menuList: () => 'p-1',
        option: (state) =>
            `px-3 py-2 text-sm cradle-text-secondary rounded-sm cursor-pointer ${state.isFocused ? 'cradle-border border-[#FF8C00] bg-opacity-50' : ''
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
    };

    if (fetchOptions) {
        return (
            <AsyncSelect
                loadOptions={fetchOptions}
                defaultOptions={staticOptions || true}
                {...commonProps}
            />
        );
    }

    return (
        <Select
            options={staticOptions || []}
            {...commonProps}
        />
    );
};

export default Selector;
