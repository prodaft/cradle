/**
 * Form components
 *
 * Comprehensive form system with react-hook-form integration and API error handling.
 */

// Main Form component
export { default as Form, useFormContext } from './Form';
export type { FormProps } from './Form';

// Form field components
export { default as FormCheckbox } from './FormCheckbox';
export { default as FormInput } from './FormInput';
export { default as FormRadioGroup } from './FormRadioGroup';
export { default as FormTextArea } from './FormTextArea';


// Shared types
export type {
    BaseFieldProps,
    CheckboxFieldProps,
    RadioGroupFieldProps,
    RadioOption,
    SelectFieldProps,
    SelectOption,
    TextAreaFieldProps,
    TextFieldProps,
} from './shared/types';

// Shared components
export { default as FormFieldWrapper } from './shared/FormFieldWrapper';
export type { FormFieldWrapperProps } from './shared/FormFieldWrapper';

// Settings components (AccountSettings style)
export { default as SettingsCard } from './SettingsCard';
export type { SettingsCardProps } from './SettingsCard';

export { default as SettingsField } from './SettingsField';
export type { SettingsFieldProps } from './SettingsField';

export { default as SettingsSelect } from './SettingsSelect';
export type { SettingsSelectProps } from './SettingsSelect';

export { default as SettingsButton } from './SettingsButton';
export type { SettingsButtonProps } from './SettingsButton';

export { default as SettingsTextArea } from './SettingsTextArea';
export type { SettingsTextAreaProps } from './SettingsTextArea';

export { default as SettingsRadio } from './SettingsRadio';
export type {
    RadioOption as SettingsRadioOption,
    SettingsRadioProps,
} from './SettingsRadio';

// Legacy components (kept for backwards compatibility)
/** @deprecated Use FormInput instead */
export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as ShadcnSelect } from './ShadcnSelect';
export type { SelectOption, ShadcnSelectProps } from './ShadcnSelect';

export { default as SearchFilter } from './SearchFilter';
export type { SearchFilterProps } from './SearchFilter';

export { default as FileInput } from './FileInput';
export type { FileInputProps } from './FileInput';
