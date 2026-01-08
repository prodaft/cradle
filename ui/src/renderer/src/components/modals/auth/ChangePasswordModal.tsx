import { Form, FormInput } from '@/components/forms';
import useApi from '@/hooks/api/useApi';
import * as Yup from 'yup';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
        <>
            <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                    Choose a strong password that you haven't used elsewhere.
                    For security, you'll need to enter your current password first.
                </DialogDescription>
            </DialogHeader>

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

                        <div className='flex justify-end gap-2 mt-4'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={closeModal}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type='submit'
                                variant='default'
                                size='sm'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Updating...' : 'Change'}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}
