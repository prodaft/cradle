import { AuthHeader, AuthLayout } from '@/components/domain/auth/auth-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { getDisplayMessage, getSuccessMessage, parseAPIError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const forgotPasswordSchema = z.object({
    email: z.email({ error: 'Invalid email' }).min(1, { error: 'Email is required' }),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

/**
 * ForgotPassword component - renders the form for a user to get a forgot password email.
 */
export default function ForgotPassword() {
    const location = useRouterState({
        select: (state) => state.location,
    });
    const router = useRouter();
    const { role } = useAuthState();
    const { isLoggedIn } = useAuthActions();

    const requestReset = useMutation({
        mutationFn: async (email: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/auth/password/reset/',
                { body: { email } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            suppressNotification: true,
        },
        onError: async (error) => {
            const parsed = await parseAPIError(error);
            setFormAlert({
                show: true,
                message: getDisplayMessage(parsed),
                color: 'red',
                title: parsed.title,
            });
        },
        onSuccess: (data) => {
            setFormAlert({
                show: true,
                message: getSuccessMessage(data) ?? '',
                color: 'green',
            });
        },
    });
    const [formAlert, setFormAlert] = useState<{
        show: boolean;
        message: string;
        color: string;
        title?: string;
    }>({
        show: false,
        message: '',
        color: 'red',
    });

    const form = useForm<FormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    useEffect(() => {
        if (isLoggedIn()) {
            router.navigate({ to: '/', replace: true });
        }
    }, [role, router, isLoggedIn]);

    const onSubmit = async (data: FormData) => {
        requestReset.mutate(data.email);
    };

    if (isLoggedIn()) {
        return null;
    }

    return (
        <AuthLayout>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup className='gap-[18px] sm:gap-4'>
                    <AuthHeader
                        title='Reset your password'
                        description="Enter your email and we'll send reset instructions."
                    />
                    <Controller
                        name='email'
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldContent>
                                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                    <Input
                                        {...field}
                                        id={field.name}
                                        type='email'
                                        aria-invalid={fieldState.invalid}
                                        autoComplete='email'
                                        autoFocus={true}
                                        required
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />
                    {formAlert.show && (
                        <Alert
                            variant={
                                formAlert.color === 'red' || formAlert.color === 'error'
                                    ? 'destructive'
                                    : 'default'
                            }
                        >
                            <WarningCircleIcon weight='bold' />
                            <AlertTitle>
                                {formAlert.color === 'red' ||
                                formAlert.color === 'error'
                                    ? formAlert.title || 'Error'
                                    : 'Success'}
                            </AlertTitle>
                            <AlertDescription>{formAlert.message}</AlertDescription>
                        </Alert>
                    )}
                    <Button
                        type='submit'
                        className='w-full'
                        disabled={requestReset.isPending}
                        data-testid='send-reset-link-button'
                    >
                        {requestReset.isPending && <Spinner />}
                        Send reset link
                    </Button>
                    <FieldDescription className='border-t pt-3.5 text-center'>
                        Remember your password?{' '}
                        <Link
                            to='/login'
                            className='text-primary underline-offset-4 hover:underline'
                            state={location.state}
                            replace={true}
                        >
                            Sign in
                        </Link>
                    </FieldDescription>
                </FieldGroup>
            </form>
        </AuthLayout>
    );
}
