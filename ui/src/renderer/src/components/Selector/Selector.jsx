import React from 'react';
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
    menuPosition = 'absolute',
    ...rest
}) => {
    const customSelectClassNames = {
        control: (state) =>
            `input input-block min-h-[2.5rem] px-1.5 ${
                state.isFocused ? 'ring-2 ring-cradle2' : ''
            }`,
        placeholder: () => 'dark:text-gray-400',
        input: () => 'text-inherit',
        menu: () =>
            'bg-gray-2 border border-gray-300 rounded-md mt-1 z-100 position-fixed',
        menuList: () => 'bg-transparent p-0',
        option: (state) =>
            `${state.isFocused ? 'bg-gray-300 text-gray-800' : 'bg-transparent'} p-1`,
        multiValue: () => 'bg-gray-400 rounded-sm mx-1 my-1 ',
        multiValueLabel: () => 'text-gray-800 pl-1',
        multiValueRemove: () =>
            'text-gray-800 hover:bg-gray-300 hover:text-gray-900 ml-1',
    };

    if (fetchOptions) {
        return (
            <AsyncSelect
                value={value}
                onChange={onChange}
                loadOptions={fetchOptions}
                defaultOptions={staticOptions || true}
                isMulti={isMulti}
                placeholder={placeholder}
                menuPosition={menuPosition}
                unstyled={true}
                classNames={customSelectClassNames}
                {...rest}
            />
        );
    }

    return (
        <Select
            value={value}
            onChange={onChange}
            options={staticOptions || []}
            isMulti={isMulti}
            placeholder={placeholder}
            unstyled={true}
            menuPosition={menuPosition}
            classNames={customSelectClassNames}
            {...rest}
        />
    );
};

export default Selector;
