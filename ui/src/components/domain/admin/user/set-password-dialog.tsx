import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

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
 * SetUserPasswordDialog component props
 */
export interface SetUserPasswordDialogProps {
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
 * SetUserPasswordDialog component - allows admins to set a password for another user
 * without requiring the old password.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <SetUserPasswordDialog open={open} onOpenChange={setOpen} userId="user-id" />
 * ```
 */
export default function SetUserPasswordDialog({
    open,
    onOpenChange,
    userId,
    onSuccess,
}: SetUserPasswordDialogProps): React.JSX.Element {
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const setPasswordMutation = useMutation({
        mutationFn: async (password: string) => {
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userId } },
                body: { password },
            });
            if (error) throw { response, error };
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
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Confirm</DialogTitle>
                        <DialogDescription>
                            Set a new password for this user. The user will need to use
                            this password to log in.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='gap-4 py-4'>
                        <Controller
                            name='newPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        New Password
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={showNewPassword ? 'text' : 'password'}
                                            placeholder='Enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={setPasswordMutation.isPending}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setShowNewPassword(!showNewPassword)
                                                }
                                                aria-label={
                                                    showNewPassword
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    showNewPassword
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {showNewPassword ? (
                                                    <EyeSlashIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                ) : (
                                                    <EyeIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                )}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    <FieldDescription>
                                        Must be at least 12 characters and contain at
                                        least one uppercase letter, one lowercase
                                        letter, one digit, and one special character.
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                        <Controller
                            name='confirmNewPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Confirm New Password
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                showConfirmPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            placeholder='Re-enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={setPasswordMutation.isPending}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        !showConfirmPassword,
                                                    )
                                                }
                                                aria-label={
                                                    showConfirmPassword
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    showConfirmPassword
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeSlashIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                ) : (
                                                    <EyeIcon
                                                        className='size-4'
                                                        weight='bold'
                                                    />
                                                )}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={form.formState.isSubmitting}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={form.formState.isSubmitting}
                        >
                            {setPasswordMutation.isPending ? 'Setting...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
