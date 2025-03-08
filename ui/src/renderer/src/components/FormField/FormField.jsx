/**
 * @function handleInput
 * @param {string} str - the value of the input field
 * @returns {any}
 */

import { forwardRef } from 'react';

/**
 * FormField component - a styled form field with a label and input
 *
 * @function FormField
 * @param {Object} props - the props of the component
 * @param {string} props.name - the name of the input field
 * @param {string} props.type - the type of the input field
 * @param {string} props.labelText - the text of the label
 * @param {handleInput} props.handleInput - callback used when the value of the input changes
 * @param {boolean} props.autofocus - whether the input should be autofocused
 * @returns {FormField}
 * @constructor
 */
const FormField = forwardRef(function (
    {
        name,
        type,
        value,
        labelText,
        handleInput,
        placeholder = '',
        autofocus = false,
        disabled = false,
        row = false,
        ...props
    },
    ref,
) {
    return (
        <div className='form-control flex flex-column justify-between items-center'>
            <label
                className={`label flex ${row ? 'flex-row' : 'flex-col'} justify-between w-full`}
            >
                <span className='label-text'>{labelText}</span>
                <div className='mt-2'>
                    <input
                        id={name}
                        name={name}
                        type={type}
                        autoComplete={name}
                        onChange={(e) => handleInput(e.target.value)}
                        disabled={disabled}
                        className='form-input input-ghost-primary input-block input focus:ring-0'
                        autoFocus={autofocus}
                        placeholder={placeholder}
                        value={value}
                        ref={ref}
                        {...props}
                    />
                </div>
            </label>
        </div>
    );
});

export default FormField;
