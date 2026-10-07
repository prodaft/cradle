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
import { generatePassword } from '@/utils/password';
import { zodResolver } from '@hookform/resolvers/zod';
import { DiceSixIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const adminSetPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(12, { error: 'Password must be at least 12 characters' })
            .regex(/[0-9]/, { error: 'Password must contain at least 1 digit' })
            .regex(/[A-Z]/, {
                error: 'Password must contain at least 1 uppercase letter',
            })
            .regex(/[^a-zA-Z0-9]/, {
                error: 'Password must contain at least 1 special character',
            }),
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
interface SetUserPasswordDialogProps {
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
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(adminSetPasswordSchema),
        defaultValues: {
            newPassword: '',
            confirmNewPassword: '',
        },
    });

    const setUserPassword = useMutation({
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
            form.reset();
            if (onSuccess) {
                onSuccess();
            }
            onOpenChange(false);
        },
    });

    useEffect(() => {
        if (!open) {
            form.reset();
            setIsPasswordVisible(false);
            setIsConfirmPasswordVisible(false);
        }
    }, [open, form]);

    const handleGeneratePassword = () => {
        const password = generatePassword();
        form.setValue('newPassword', password, { shouldValidate: true });
        form.setValue('confirmNewPassword', password, { shouldValidate: true });
        setIsPasswordVisible(true);
    };

    const onSubmit = async (data: FormData) => {
        setUserPassword.mutate(data.newPassword);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Set Password</DialogTitle>
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
                                            type={
                                                isPasswordVisible ? 'text' : 'password'
                                            }
                                            placeholder='Enter new password'
                                            aria-invalid={fieldState.invalid}
                                            disabled={setUserPassword.isPending}
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupButton
                                                type='button'
                                                onClick={handleGeneratePassword}
                                                disabled={setUserPassword.isPending}
                                                aria-label='Generate password'
                                                title='Generate password'
                                            >
                                                <DiceSixIcon
                                                    className='size-4'
                                                    weight='bold'
                                                />
                                            </InputGroupButton>
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
                                        Confirm New Password
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
                                            disabled={setUserPassword.isPending}
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
                                    disabled={setUserPassword.isPending}
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={setUserPassword.isPending}
                        >
                            {setUserPassword.isPending ? 'Setting...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
