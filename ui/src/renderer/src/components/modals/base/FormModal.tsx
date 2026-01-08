import { useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
                {fields.map((field, index) => (
                    <div key={index} className='grid w-full items-center gap-3 mb-5'>
                        <Label htmlFor={field.name}>
                            {field.label}
                        </Label>
                        {field.type === 'textarea' ? (
                            <textarea
                                id={field.name}
                                name={field.name}
                                className='flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        ) : (
                            <Input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                placeholder={field.placeholder || ''}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}

                {/* Action buttons */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={closeModal}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        variant='default'
                        size='sm'
                    >
                        Submit
                    </Button>
                </div>
            </form>
        </>
    );
}
