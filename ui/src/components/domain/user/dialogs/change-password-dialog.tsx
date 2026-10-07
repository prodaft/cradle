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
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

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
 * ChangePasswordDialog component props
 */
interface ChangePasswordDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
}

/**
 * ChangePasswordDialog component - allows an authenticated user to change their password
 * by providing their old password and a new password in a dialog.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <ChangePasswordDialog open={open} onOpenChange={setOpen} />
 * ```
 */
export default function ChangePasswordDialog({
    open,
    onOpenChange,
}: ChangePasswordDialogProps) {
    const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const changePassword = useMutation({
        mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
            const { error, response } = await fetchClient.POST(
                '/auth/change-password/',
                {
                    body: {
                        old_password: data.oldPassword,
                        new_password: data.newPassword,
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Password changed successfully',
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
        changePassword.mutate({
            oldPassword: data.oldPassword,
            newPassword: data.newPassword,
        });
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Choose a strong password that you haven't used elsewhere.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='gap-4'>
                        <Controller
                            name='oldPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Current Password{' '}
                                        <span className='text-destructive'>*</span>
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                isOldPasswordVisible
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            placeholder='Enter current password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={changePassword.isPending}
                                            required
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsOldPasswordVisible(
                                                        !isOldPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isOldPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    isOldPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {isOldPasswordVisible ? (
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

                        <Controller
                            name='newPassword'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        New Password{' '}
                                        <span className='text-destructive'>*</span>
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                isPasswordVisible ? 'text' : 'password'
                                            }
                                            placeholder='Enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={changePassword.isPending}
                                            required
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsPasswordVisible(
                                                        !isPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    isPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {isPasswordVisible ? (
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
                                        Confirm New Password{' '}
                                        <span className='text-destructive'>*</span>
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={field.name}
                                            type={
                                                isConfirmPasswordVisible
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            placeholder='Re-enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={changePassword.isPending}
                                            required
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={() =>
                                                    setIsConfirmPasswordVisible(
                                                        !isConfirmPasswordVisible,
                                                    )
                                                }
                                                aria-label={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                                title={
                                                    isConfirmPasswordVisible
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {isConfirmPasswordVisible ? (
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
                        <DialogClose
                            render={
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={changePassword.isPending}
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={changePassword.isPending}
                        >
                            {changePassword.isPending ? 'Updating...' : 'Change'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}
