import PropTypes from 'prop-types';

/**
 * Form field component that displays validation errors.
 * Use with useFormValidation hook for automatic error display.
 * 
 * @example
 * const { getFieldError } = useFormValidation();
 * 
 * <FormFieldWithError
 *   name="username"
 *   label="Username"
 *   error={getFieldError('username')}
 * />
 */
export default function FormFieldWithError({
    name,
    label,
    type = 'text',
    error = null,
    required = false,
    placeholder = '',
    value,
    onChange,
    onBlur,
    disabled = false,
    className = '',
    ...props
}) {
    const hasError = error && error.length > 0;

    return (
        <div className={`form-field ${className}`}>
            {label && (
                <label 
                    htmlFor={name} 
                    className="block text-sm font-medium cradle-text-secondary mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                className={`
                    cradle-input w-full
                    ${hasError ? 'border-red-500 focus:ring-red-500' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                {...props}
            />
            
            {hasError && (
                <div className="mt-1 space-y-1">
                    {error.map((errorMsg, idx) => (
                        <p 
                            key={idx} 
                            className="text-sm text-red-500 cradle-text-error"
                        >
                            {errorMsg}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

FormFieldWithError.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    type: PropTypes.string,
    error: PropTypes.arrayOf(PropTypes.string),
    required: PropTypes.bool,
    placeholder: PropTypes.string,
    value: PropTypes.any,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

