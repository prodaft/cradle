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
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        <div className='w-[100%]'>
            <h2 className='text-2xl font-bold mb-4'>{title}</h2>
            <form onSubmit={handleSubmit}>
                {fields.map((field, index) => (
                    <div key={index} className='mb-4'>
                        <label
                            htmlFor={field.name}
                            className='block text-sm font-medium text-gray-700 mb-1'
                        >
                            {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                                id={field.name}
                                name={field.name}
                                className='textarea textarea-bordered w-full'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        ) : (
                            <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                className='input input-block input-bordered w-full'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}
                <div className='flex justify-end gap-2'>
                    <button type='button' className='btn' onClick={closeModal}>
                        Cancel
                    </button>
                    <button type='submit' className='btn btn-primary'>
                        Submit
                    </button>
                </div>
            </form>
        </div>
    );
}
