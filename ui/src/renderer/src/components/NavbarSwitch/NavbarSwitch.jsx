import { useId } from 'react';

/**
 * NavbarSwitch
 * A switch component for the navbar.
 *
 * @function NavbarSwitch
 * @param {Object} props - the props of the component
 * @param {string} props.text - the label for the switch
 * @param {boolean} props.checked - the checked status of the switch
 * @param {Function} props.onChange - the handler for the switch
 * @returns {NavbarSwitch}
 * @constructor
 */
export default function NavbarSwitch({ text, checked, onChange, testid }) {
    const id = useId();

    return (
        <button className='navbar-item hover:bg-gray-4'>
            <div className='flex flex-row items-center w-fit h-fit'>
                <label htmlFor={id} className='mr-2 text-primary hover:cursor-pointer'>
                    {text}
                </label>
                <input
                    type='checkbox'
                    id={id}
                    className='switch focus:ring-0'
                    checked={checked}
                    onChange={onChange}
                    data-testid={testid || ''}
                />
            </div>
        </button>
    );
}
