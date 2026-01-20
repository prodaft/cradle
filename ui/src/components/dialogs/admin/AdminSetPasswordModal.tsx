import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import useApi from '@/hooks/api/useApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const adminSetPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, { error: 'Password must be at least 8 characters' })
            .min(1, { error: 'New password is required' }),
        confirmNewPassword: z
            .string()
            .min(1, { error: 'Please confirm your new password' }),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        error: 'New passwords do not match',
        path: ['confirmNewPassword'],
    });

type FormData = z.infer<typeof adminSetPasswordSchema>;

/**
 * AdminSetPasswordModal component props
 */
export interface AdminSetPasswordModalProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** User ID of the user whose password is being set */
    userId: string;
    /** Optional callback when password is successfully set */
    onSuccess?: () => void;
}

/**
 * AdminSetPasswordModal component - allows admins to set a password for another user
 * without requiring the old password.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <AdminSetPasswordModal open={open} onOpenChange={setOpen} userId="user-id" />
 * ```
 */
export default function AdminSetPasswordModal({
    open,
    onOpenChange,
    userId,
    onSuccess,
}: AdminSetPasswordModalProps): React.JSX.Element {
    const { usersApi } = useApi();

    const setPasswordMutation = useMutation({
        mutationFn: async (password: string) => {
            await usersApi.usersUpdate({
                userId,
                userUpdateRequest: {
                    password,
                },
            });
        },
        meta: {
            successMessage: 'Password updated successfully',
        },
        onSuccess: () => {
            if (onSuccess) {
                onSuccess();
            }
            onOpenChange(false);
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(adminSetPasswordSchema),
        defaultValues: {
            newPassword: '',
            confirmNewPassword: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        setPasswordMutation.mutate(data.newPassword);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for this user. The user will need to use this
                        password to log in.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
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
                                            disabled={setPasswordMutation.isPending}
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
                                            disabled={setPasswordMutation.isPending}
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
                            {setPasswordMutation.isPending
                                ? 'Setting...'
                                : 'Set Password'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
