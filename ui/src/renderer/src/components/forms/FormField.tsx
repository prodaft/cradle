import { ForwardedRef, forwardRef, InputHTMLAttributes } from 'react';

/**
 * FormField component props
 */
export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Name of the input field */
  name: string;
  /** Type of the input field */
  type: string;
  /** Value of the input field */
  value?: string;
  /** Label text for the field */
  labelText: string;
  /** Callback used when the value of the input changes */
  handleInput: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input should be autofocused */
  autofocus?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to display label and input in a row */
  row?: boolean;
}

/**
 * FormField component - a styled form field with a label and input
 *
 * @example
 * ```tsx
 * <FormField
 *   name="username"
 *   type="text"
 *   value={username}
 *   labelText="Username"
 *   handleInput={setUsername}
 *   placeholder="Enter username"
 *   autofocus
 * />
 * ```
 */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
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
    ref: ForwardedRef<HTMLInputElement>,
  ): JSX.Element {
    return (
      <div className='w-full'>
        <label
          className={`flex ${row ? 'flex-row items-center' : 'flex-col'} justify-between w-full gap-2`}
        >
          <span className='cradle-label cradle-text-tertiary'>{labelText}</span>
          <div className={`${row ? '' : 'w-full'}`}>
            <input
              id={name}
              name={name}
              type={type}
              autoComplete={name}
              onChange={(e) => handleInput(e.target.value)}
              disabled={disabled}
              className='cradle-search w-full disabled:opacity-50 disabled:cursor-not-allowed'
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
  },
);

export default FormField;
