import { useState } from 'react';
import useApi from '@/hooks/api/useApi';
import { Alert } from '@/types';
import { displayError } from '@/utils/api';
import AlertBox from '@/components/base/Alert/AlertBox';
import FormField from '@/components/forms/FormField';

/**
 * Form data structure for password change
 */
interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * ChangePasswordModal component props
 */
export interface ChangePasswordModalProps {
  /** Function to close the modal */
  closeModal: () => void;
}

/**
 * ChangePasswordModal component - allows an authenticated user to change their password
 * by providing their old password and a new password in a modal dialog.
 *
 * @example
 * ```tsx
 * <ChangePasswordModal closeModal={closeModal} />
 * ```
 */
export default function ChangePasswordModal({ closeModal }: ChangePasswordModalProps): JSX.Element {
    const [formData, setFormData] = useState<PasswordFormData>({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { usersApi } = useApi();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
            await usersApi.usersChangePasswordCreate({
                changePasswordRequestRequest: {
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword,
                },
            });
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

    const handleInputChange = (field: keyof PasswordFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [field]: e.target.value,
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
                        label='Current Password'
                        placeholder='Enter current password'
                        value={formData.oldPassword}
                        onChange={handleInputChange('oldPassword')}
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
                            label='New Password'
                            placeholder='Enter new password'
                            value={formData.newPassword}
                            onChange={handleInputChange('newPassword')}
                        />

                        <FormField
                            name='confirmNewPassword'
                            type='password'
                            label='Confirm New Password'
                            placeholder='Re-enter new password'
                            value={formData.confirmNewPassword}
                            onChange={handleInputChange('confirmNewPassword')}
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
