/**
 * FormSelect - Select dropdown component for react-hook-form
 * Wraps the existing Selector component with Controller
 */

import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';
import { GroupBase } from 'react-select';
import Selector from './Selector';
import FormFieldWrapper from './shared/FormFieldWrapper';
import { SelectFieldProps, SelectOption } from './shared/types';

/**
 * Select dropdown component that integrates with react-hook-form via Controller.
 * Supports both static options and async loading.
 *
 * @example
 * ```tsx
 * // Static options
 * <Form schema={schema} onSubmit={handleSubmit}>
 *   <FormSelect
 *     name="role"
 *     label="Role"
 *     options={[
 *       { value: 'admin', label: 'Admin' },
 *       { value: 'user', label: 'User' },
 *     ]}
 *   />
 * </Form>
 *
 * // Multi-select with async options
 * <FormSelect
 *   name="tags"
 *   label="Tags"
 *   isMulti
 *   fetchOptions={async (input) => {
 *     const response = await fetch(`/api/tags?q=${input}`);
 *     return response.json();
 *   }}
 * />
 *
 * // With custom onChange handler
 * <FormSelect
 *   name="category"
 *   label="Category"
 *   options={categoryOptions}
 *   onChange={(value) => console.log('Selected:', value)}
 * />
 * ```
 */
export default function FormSelect<
    TFieldValues extends FieldValues = FieldValues,
    TOption extends SelectOption = SelectOption,
    IsMulti extends boolean = false,
    Group extends GroupBase<TOption> = GroupBase<TOption>,
>({
    name,
    label,
    helperText,
    required = false,
    disabled = false,
    isDisabled,
    className = '',
    options,
    fetchOptions,
    isMulti,
    placeholder = 'Select...',
    isSearchable = true,
    isClearable = false,
    onChange: onChangeProp,
}: SelectFieldProps<TFieldValues, TOption, IsMulti>): JSX.Element {
    const {
        control,
        formState: { errors },
    } = useFormContext<TFieldValues>();

    // Get error message
    const error = errors[name];
    const errorMessage = error?.message as string | undefined;

    // Support both disabled and isDisabled props
    const isFieldDisabled = disabled || isDisabled;

    return (
        <FormFieldWrapper
            name={name}
            label={label}
            required={required}
            helperText={helperText}
            error={errorMessage}
            className={className}
        >
            <Controller
                name={name as Path<TFieldValues>}
                control={control}
                render={({ field }) => (
                    <Selector<TOption, IsMulti, Group>
                        staticOptions={options}
                        fetchOptions={fetchOptions}
                        isMulti={isMulti}
                        placeholder={placeholder}
                        isSearchable={isSearchable}
                        isClearable={isClearable}
                        isDisabled={isFieldDisabled}
                        value={field.value}
                        onChange={(newValue) => {
                            field.onChange(newValue);
                            // Call custom onChange if provided
                            if (onChangeProp) {
                                onChangeProp(
                                    newValue as IsMulti extends true
                                        ? TOption[]
                                        : TOption | null,
                                );
                            }
                        }}
                        onBlur={field.onBlur}
                        classNames={{
                            control: (state) =>
                                `input input-block min-h-[2.5rem] !p-0 ${
                                    state.isFocused ? 'ring-1 ring-cradle2' : ''
                                } ${errorMessage ? 'border-red-500' : ''}`,
                        }}
                    />
                )}
            />
        </FormFieldWrapper>
    );
}
