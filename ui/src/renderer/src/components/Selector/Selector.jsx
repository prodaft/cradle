import React, { useEffect, useState } from 'react';
import Select from 'react-select';

// Custom classNames functions using Tailwind CSS classes.
const customSelectClassNames = {
    control: (state) =>
        `bg-transparent border border-white dark:border-gray-800 rounded-md min-h-[2.5rem] p-1.5 ${
            state.isFocused ? 'ring-2 ring-cradle2' : ''
        }`,
    placeholder: () => 'dark:text-gray-400',
    input: () => 'text-inherit',
    menu: () => 'bg-gray-2 border border-gray-300 rounded-md mt-1 z-50',
    menuList: () => 'bg-transparent p-0',
    option: (state) =>
        `${state.isFocused ? 'bg-gray-300 text-gray-800' : 'bg-transparent'} p-1`,
    multiValue: () => 'bg-gray-400 rounded-sm mx-1',
    multiValueLabel: () => 'text-gray-800 pl-1',
    multiValueRemove: () => 'text-gray-800 hover:bg-gray-300 hover:text-gray-900 ml-1',
};

const Selector = ({
    isMulti = false,
    fetchOptions,
    staticOptions,
    placeholder = 'Select...',
    value,
    onChange,
    ...rest
}) => {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        if (fetchOptions && typeof fetchOptions === 'function') {
            fetchOptions()
                .then((opts) => setOptions(opts))
                .catch((err) => console.error('Error fetching options:', err));
        } else if (staticOptions) {
            setOptions(staticOptions);
        }
    }, [fetchOptions, staticOptions]);

    return (
        <Select
            value={value}
            onChange={onChange}
            options={options}
            isMulti={isMulti}
            placeholder={placeholder}
            unstyled={true}
            classNames={customSelectClassNames}
            {...rest}
        />
    );
};

export default Selector;
