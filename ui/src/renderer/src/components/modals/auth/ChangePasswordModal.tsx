import { Form, FormInput } from '@/components/forms';
import useApi from '@/hooks/api/useApi';
import { Xmark } from 'iconoir-react';
import * as Yup from 'yup';

interface FormData {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

const changePasswordSchema = Yup.object().shape({
    oldPassword: Yup.string().required('Current password is required'),
    newPassword: Yup.string().required('New password is required'),
    confirmNewPassword: Yup.string()
        .required('Please confirm your new password')
        .oneOf([Yup.ref('newPassword')], 'New passwords do not match'),
});

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
export default function ChangePasswordModal({
    closeModal,
}: ChangePasswordModalProps): JSX.Element {
    const { usersApi } = useApi();

    const handleSubmit = async (data: FormData) => {
        await usersApi.usersChangePasswordCreate({
            changePasswordRequestRequest: {
                oldPassword: data.oldPassword,
                newPassword: data.newPassword,
            },
        });
    };

    return (
        <div className='w-full min-w-[28rem]'>
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl font-semibold cradle-text-primary cradle-mono'>
                    Change Password
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

            {/* Info Section */}
            <div className='mb-6 p-4 cradle-border cradle-bg-secondary rounded'>
                <div className='flex items-start gap-3'>
                    <div className='cradle-status-light cradle-status-info mt-1 flex-shrink-0'></div>
                    <div>
                        <h3 className='text-sm font-semibold cradle-text-primary cradle-mono mb-1'>
                            Password Requirements
                        </h3>
                        <p className='text-xs cradle-text-tertiary cradle-mono leading-relaxed'>
                            Choose a strong password that you haven't used elsewhere.
                            For security, you'll need to enter your current password
                            first.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <Form<FormData>
                schema={changePasswordSchema}
                defaultValues={{
                    oldPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                }}
                onSubmit={handleSubmit}
                onSuccess={closeModal}
                className='space-y-5'
            >
                {({ formState: { isSubmitting } }) => (
                    <>
                        <div>
                            <FormInput<FormData>
                                name='oldPassword'
                                type='password'
                                label='Current Password'
                                placeholder='Enter current password'
                            />
                        </div>

                        <div className='cradle-separator'></div>

                        <div>
                            <div className='space-y-4'>
                                <FormInput<FormData>
                                    name='newPassword'
                                    type='password'
                                    label='New Password'
                                    placeholder='Enter new password'
                                />
                                <FormInput<FormData>
                                    name='confirmNewPassword'
                                    type='password'
                                    label='Confirm New Password'
                                    placeholder='Re-enter new password'
                                />
                            </div>
                        </div>

                        <div className='cradle-border-t pt-5 mt-5'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary w-full'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
