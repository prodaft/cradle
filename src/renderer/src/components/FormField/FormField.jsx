/**
 * @function handleInput
 * @param {string} str - the value of the input field
 * @returns {any}
 */

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
export default function FormField({ name, type, labelText, handleInput, autofocus = false }) {
    return (
        <div className='w-full'>
            <label htmlFor={name} className='block text-sm font-medium leading-6'>
                {labelText}
            </label>
            <div className='mt-2'>
                <input
                    id={name}
                    name={name}
                    type={type}
                    autoComplete={name}
                    onChange={(e) => handleInput(e.target.value)}
                    required
                    className='form-input input-ghost-primary input-block input focus:ring-0'
                    autoFocus={autofocus}
                />
            </div>
        </div>
    );
}
