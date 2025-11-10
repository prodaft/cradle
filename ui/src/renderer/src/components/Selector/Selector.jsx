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
            `input input-block !p-0 ${state.isFocused ? 'ring-2 ring-cradle2' : ''} min-h-0 h-auto`,
        valueContainer: () =>
            'px-2 gap-2 flex items-center flex-wrap py-1',
        placeholder: () => 'text-gray-500 dark:text-gray-400',
        input: () => 'text-inherit m-0 p-0',
        singleValue: () => 'text-inherit',
        indicatorsContainer: () => 'pr-2',
        menu: () => 'cradle-bg-elevated cradle-border mt-1 shadow-lg z-[9999]',
        menuPortal: () => 'z-[9999]',
        menuList: () => 'p-1',
        option: (state) =>
            `px-3 py-2 text-sm cradle-text-secondary cursor-pointer ${state.isFocused ? 'cradle-border border-cradle2 bg-cradle2 bg-opacity-20' : ''
            } ${state.isSelected ? 'bg-cradle2 bg-opacity-20' : ''}`,
        multiValue: () => 'bg-cradle2 bg-opacity-30',
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
