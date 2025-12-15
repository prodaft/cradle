import { Xmark } from 'iconoir-react';
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
        <div className='min-w-[320px] max-w-lg'>
            {/* Header with title and close button */}
            <div className='flex items-center justify-between mb-5'>
                <h2 className='text-lg font-semibold text-cradle-text-primary tracking-wide'>
                    {title}
                </h2>
                <button
                    type='button'
                    className='cradle-btn p-2 rounded-full'
                    onClick={closeModal}
                    title='Close'
                >
                    <Xmark width={16} height={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {fields.map((field, index) => (
                    <div key={index} className='mb-4'>
                        <label
                            htmlFor={field.name}
                            className='cradle-label mb-2 block'
                        >
                            {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                                id={field.name}
                                name={field.name}
                                className='cradle-textarea'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        ) : (
                            <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                className='cradle-input'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}

                {/* Action buttons */}
                <div className='flex gap-3 pt-3'>
                    <button
                        type='button'
                        className='cradle-btn flex-1'
                        onClick={closeModal}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='cradle-btn cradle-btn-primary flex-1'
                    >
                        Submit
                    </button>
                </div>
            </form>
        </div>
    );
}
