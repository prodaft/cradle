import { useState } from 'react';

/**
 * Form field configuration
 */
export interface FormField {
    /** Unique name identifier for the field */
    name: string;
    /** Label text to display */
    label: string;
    /** Input type (text, email, password, textarea, etc.) */
    type: string;
    /** Optional placeholder text */
    placeholder?: string;
    /** Optional initial value */
    initialValue?: string;
}

/**
 * FormModal component props
 */
export interface FormModalProps {
    /** Array of form field configurations */
    fields?: FormField[];
    /** Callback function to execute when form is submitted, receives form data */
    onSubmit: (formData: Record<string, string>) => void;
    /** Function to close the modal */
    closeModal: () => void;
    /** Modal title */
    title?: string;
}

/**
 * FormModal component - a generic form modal that dynamically renders fields
 *
 * @example
 * ```tsx
 * <FormModal
 *   title="Create User"
 *   fields={[
 *     { name: 'username', label: 'Username', type: 'text', placeholder: 'Enter username' },
 *     { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email' }
 *   ]}
 *   onSubmit={(data) => console.log(data)}
 *   closeModal={closeModal}
 * />
 * ```
 */
export default function FormModal({
    fields = [],
    onSubmit,
    closeModal,
    title = 'Fill Out the Form',
}: FormModalProps): JSX.Element {
    // Initialize form state based on the provided fields.
    const initialFormData = fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.name] = field.initialValue || '';
        return acc;
    }, {});

    const [formData, setFormData] = useState<Record<string, string>>(initialFormData);

    // Handle input changes generically.
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle form submission.
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(formData);
        if (closeModal) closeModal();
    };

    return (
        <div className='min-w-[400px] max-w-lg'>
            {/* Header with title */}
            <div className='flex items-end justify-between mb-5'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        {title}
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {fields.map((field, index) => (
                    <div key={index} className='mb-5'>
                        <label htmlFor={field.name} className='cradle-label mb-2 block'>
                            {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                                id={field.name}
                                name={field.name}
                                className='cradle-input w-full min-h-[100px] py-2'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        ) : (
                            <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                className='cradle-input w-full'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}

                {/* Action buttons */}
                <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                    <button
                        type='button'
                        className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                        onClick={closeModal}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='rounded-lg border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                    >
                        Submit
                    </button>
                </div>
            </form>
        </div>
    );
}
