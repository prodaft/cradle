import ConfirmDeletionDialog from '@/components/dialogs/base/confirm-deletion-dialog';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { getSuccessMessage } from '@/utils/api';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserManagementActionsProps {
    userId: string;
}

export default function UserManagementActions({ userId }: UserManagementActionsProps) {
    const router = useRouter();
    const { setTokensDirectly } = useAuthActions();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        { enabled: !!userId, meta: { suppressNotification: true } },
    );

    const simulateSessionMutation = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/users/{user_id}/manage/{action_name}',
                {
                    params: {
                        path: { user_id: userId, action_name: 'simulate' },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: { suppressNotification: true },
        onSuccess: (res: any) => {
            setTokensDirectly({
                access: res.access,
                refresh: res.refresh,
                accessExpiresAt: new Date(res.access_expires_at),
                refreshExpiresAt: new Date(res.refresh_expires_at),
                role: res.role,
            });
            router.navigate({ to: '/', replace: true });
        },
    });

    const sendEmailConfirmationMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.GET(
                '/users/{user_id}/manage/{action_name}',
                {
                    params: {
                        path: {
                            user_id: userId,
                            action_name: 'send_email_confirmation',
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Email confirmation sent successfully' },
    });

    const sendPasswordResetEmailMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.GET(
                '/users/{user_id}/manage/{action_name}',
                {
                    params: {
                        path: {
                            user_id: userId,
                            action_name: 'password_reset_email',
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Password reset email sent successfully' },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.DELETE(
                '/users/{user_id}/',
                { params: { path: { user_id: userId } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: { suppressNotification: true },
        onSuccess: (response) => {
            toast.success(getSuccessMessage(response) || 'User deleted successfully');
            router.navigate({ to: '/manage/users' } as any);
        },
    });

    return (
        <>
            <section id='admin-actions'>
                <div className='flex flex-col gap-4'>
                    <FieldGroup className='gap-4'>
                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block'>
                                    Simulate Session
                                </FieldLabel>
                                <FieldDescription>
                                    Jump into a session for this user
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-start md:self-center'
                                onClick={() => simulateSessionMutation.mutate()}
                            >
                                Simulate
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block'>
                                    Email Confirmation
                                </FieldLabel>
                                <FieldDescription>
                                    Send email verification to user
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-start md:self-center'
                                onClick={() => sendEmailConfirmationMutation.mutate()}
                            >
                                Send Email
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block'>
                                    Password Reset
                                </FieldLabel>
                                <FieldDescription>
                                    Send password reset email
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-start md:self-center'
                                onClick={() => sendPasswordResetEmailMutation.mutate()}
                            >
                                Send Reset
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block'>
                                    Delete
                                </FieldLabel>
                                <FieldDescription>
                                    Permanently remove this user and all their data
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='destructive'
                                size='sm'
                                className='self-start md:self-center'
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                Delete
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
            </section>
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => deleteUserMutation.mutate()}
                confirmText={userData?.username || 'DELETE'}
                text='Deleting this user will permanently remove all their data, including notes, entries, and settings. This action cannot be undone.'
            />
        </>
    );
}
