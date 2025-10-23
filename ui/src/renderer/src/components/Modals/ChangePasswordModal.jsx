import { useState } from 'react';
import { changePassword } from '../../services/userService/userService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';

/**
 * ChangePasswordModal component - allows an authenticated user to change their password
 * by providing their old password and a new password in a modal dialog.
 *
 * @function ChangePasswordModal
 * @param {Function} closeModal - Function to close the modal
 * @returns {JSX.Element}
 */
export default function ChangePasswordModal({ closeModal }) {
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [alert, setAlert] = useState({
        show: false,
        message: '',
        color: 'red',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if new passwords match
        if (formData.newPassword !== formData.confirmNewPassword) {
            setAlert({
                show: true,
                message: 'New passwords do not match.',
                color: 'red',
            });
            return;
        }

        setIsSubmitting(true);
        setAlert({ show: false, message: '', color: 'red' });

        try {
            await changePassword(formData.oldPassword, formData.newPassword);
            // Reset form
            setFormData({
                oldPassword: '',
                newPassword: '',
                confirmNewPassword: '',
            });
            // Close modal on success
            closeModal();
        } catch (err) {
            console.log(err);
            displayError(setAlert)(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field) => (value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className='p-6 max-w-md mx-auto'>
            {/* Header */}
            <div className='mb-6'>
                <h2 className='text-xl font-semibold cradle-text-primary cradle-mono mb-2'>
                    Change Password
                </h2>
                <p className='text-sm cradle-text-tertiary cradle-mono'>
                    Update your password to maintain account security
                </p>
            </div>

            {/* Info Section */}
            <div className='mb-6 p-4 cradle-border cradle-bg-secondary'>
                <div className='flex items-start gap-3'>
                    <div className='cradle-status-light cradle-status-info mt-1'></div>
                    <div>
                        <h3 className='text-sm font-semibold cradle-text-primary cradle-mono mb-1'>
                            Password Requirements
                        </h3>
                        <p className='text-xs cradle-text-tertiary cradle-mono leading-relaxed'>
                            Choose a strong password that you haven't used elsewhere. For security, you'll need to enter your current password first.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form className='space-y-4' onSubmit={handleSubmit}>
                <div>
                    <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-3'>
                        Current Authentication
                    </h3>
                    <FormField
                        name='oldPassword'
                        type='password'
                        labelText='Current Password'
                        placeholder='Enter current password'
                        value={formData.oldPassword}
                        handleInput={handleInputChange('oldPassword')}
                    />
                </div>

                <div className='cradle-separator'></div>

                <div>
                    <h3 className='text-sm font-semibold cradle-text-secondary cradle-mono mb-3'>
                        New Password
                    </h3>
                    <div className='space-y-3'>
                        <FormField
                            name='newPassword'
                            type='password'
                            labelText='New Password'
                            placeholder='Enter new password'
                            value={formData.newPassword}
                            handleInput={handleInputChange('newPassword')}
                        />

                        <FormField
                            name='confirmNewPassword'
                            type='password'
                            labelText='Confirm New Password'
                            placeholder='Re-enter new password'
                            value={formData.confirmNewPassword}
                            handleInput={handleInputChange('confirmNewPassword')}
                        />
                    </div>
                </div>

                <AlertBox alert={alert} />

                <div className='cradle-border-t pt-4 mt-4'>
                    <div className='flex gap-3'>
                        <button 
                            type='submit' 
                            className='cradle-btn cradle-btn-primary cradle-btn-sm flex-1'
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-ghost cradle-btn-sm flex-1'
                            onClick={closeModal}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
