import { useState } from 'react';

const FormModal = ({
    fields = [],
    onSubmit,
    closeModal,
    title = 'Fill Out the Form',
}) => {
    // Initialize form state based on the provided fields.
    const initialFormData = fields.reduce((acc, field) => {
        acc[field.name] = field.initialValue || '';
        return acc;
    }, {});

    const [formData, setFormData] = useState(initialFormData);

    // Handle input changes generically.
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle form submission.
    const handleSubmit = (e) => {
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
};

export default FormModal;
