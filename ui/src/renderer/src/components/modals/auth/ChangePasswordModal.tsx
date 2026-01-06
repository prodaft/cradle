import { Form, FormInput } from '@/components/forms';
import useApi from '@/hooks/api/useApi';
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
        <div className='min-w-[400px] max-w-lg'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Change Password
                    </h2>
                </div>
            </div>

            {/* Info Section */}
            <div className='mb-6 p-4 border border-cradle-border-accent bg-cradle-bg-secondary/30 rounded-lg'>
                <div className='flex items-start gap-3'>
                     <div className='w-2 h-2 rounded-full bg-cradle-accent-primary mt-1.5 flex-shrink-0'></div>
                    <div>
                        <h3 className='text-sm font-semibold text-cradle-text-primary mb-1'>
                            Password Requirements
                        </h3>
                        <p className='text-xs text-cradle-text-tertiary leading-relaxed'>
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

                        <div className='border-t border-cradle-border-accent my-4'></div>

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

                        <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                            <button
                                type='button'
                                className='rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-3 py-1.5 flex items-center gap-1.5'
                                onClick={closeModal}
                                disabled={isSubmitting}
                            >
                                <span>Cancel</span>
                            </button>
                            <button
                                type='submit'
                                className='rounded-full border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                                disabled={isSubmitting}
                            >
                                <span>{isSubmitting ? 'Updating...' : 'Change'}</span>
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
