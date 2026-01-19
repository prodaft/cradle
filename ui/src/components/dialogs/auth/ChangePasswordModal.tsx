import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'src/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from 'src/components/ui/dialog';
import { Field, FieldContent, FieldError, FieldLabel } from 'src/components/ui/field';
import { Input } from 'src/components/ui/input';
import useApi from 'src/hooks/api/useApi';
import { z } from 'zod';

const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, { error: 'Current password is required' }),
        newPassword: z.string().min(1, { error: 'New password is required' }),
        confirmNewPassword: z
            .string()
            .min(1, { error: 'Please confirm your new password' }),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        error: 'New passwords do not match',
        path: ['confirmNewPassword'],
    });

type FormData = z.infer<typeof changePasswordSchema>;

/**
 * ChangePasswordModal component props
 */
export interface ChangePasswordModalProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
}

/**
 * ChangePasswordModal component - allows an authenticated user to change their password
 * by providing their old password and a new password in a modal dialog.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ChangePasswordModal open={open} onOpenChange={setOpen} />
 * ```
 */
export default function ChangePasswordModal({
    open,
    onOpenChange,
}: ChangePasswordModalProps) {
    const { authApi } = useApi();

    const changePasswordMutation = useMutation({
        mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
            await authApi.authChangePasswordCreate({
                changePasswordRequestRequest: {
                    oldPassword: data.oldPassword,
                    newPassword: data.newPassword,
                },
            });
        },
        meta: {
            successMessage: 'Password changed successfully',
            errorMessage: 'Failed to change password',
        },
        onSuccess: () => {
            onOpenChange(false);
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        changePasswordMutation.mutate({
            oldPassword: data.oldPassword,
            newPassword: data.newPassword,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Choose a strong password that you haven't used elsewhere. For
                        security, you'll need to enter your current password first.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
                    <Controller
                        name='oldPassword'
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldContent>
                                    <FieldLabel htmlFor={field.name}>
                                        Current Password
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id={field.name}
                                        type='password'
                                        placeholder='Enter current password'
                                        aria-invalid={fieldState.invalid}
                                        disabled={form.formState.isSubmitting}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <div className='space-y-4'>
                        <Controller
                            name='newPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldContent>
                                        <FieldLabel htmlFor={field.name}>
                                            New Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={field.name}
                                            type='password'
                                            placeholder='Enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={form.formState.isSubmitting}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </FieldContent>
                                </Field>
                            )}
                        />

                        <Controller
                            name='confirmNewPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldContent>
                                        <FieldLabel htmlFor={field.name}>
                                            Confirm New Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={field.name}
                                            type='password'
                                            placeholder='Re-enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={form.formState.isSubmitting}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>

                    <div className='flex justify-end gap-2 mt-4'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => onOpenChange(false)}
                            disabled={form.formState.isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? 'Updating...' : 'Change'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
