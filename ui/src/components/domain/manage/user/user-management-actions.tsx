import SetUserPasswordDialog from '@/components/domain/manage/user/dialogs/set-password-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { getSuccessMessage } from '@/utils/api';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserManagementActionsProps {
    userId: string;
}

export default function UserManagementActions({ userId }: UserManagementActionsProps) {
    const router = useRouter();
    const { setTokensDirectly } = useAuthActions();
    const queryClient = useQueryClient();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);
    const [typed, setTyped] = useState('');

    const { data: user } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        { enabled: !!userId, meta: { suppressNotification: true } },
    );

    const simulateSession = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.POST(
                '/users/{user_id}/manage/{action_name}/',
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
                accessExpiresAt: new Date(res.access_expires_at),
                refreshExpiresAt: new Date(res.refresh_expires_at),
                role: res.role,
                user_id: res.user_id,
            });
            router.navigate({ to: '/', replace: true });
        },
    });

    const sendConfirmationEmail = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST(
                '/users/{user_id}/manage/{action_name}/',
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

    const sendPasswordReset = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST(
                '/users/{user_id}/manage/{action_name}/',
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

    const deleteUser = useMutation({
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
                                onClick={() => simulateSession.mutate()}
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
                                onClick={() => sendConfirmationEmail.mutate()}
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
                                onClick={() => sendPasswordReset.mutate()}
                            >
                                Send Reset
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block'>
                                    Password
                                </FieldLabel>
                                <FieldDescription>
                                    Change the password for this user
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-start md:self-center'
                                onClick={() => setIsSetPasswordOpen(true)}
                            >
                                Change
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
                                onClick={() => setIsDeleteOpen(true)}
                            >
                                Delete
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
            </section>
            {user?.id && (
                <SetUserPasswordDialog
                    open={isSetPasswordOpen}
                    onOpenChange={setIsSetPasswordOpen}
                    userId={user.id}
                    onSuccess={() => {
                        queryClient.invalidateQueries({
                            queryKey: queryKeys.users.detail(userId),
                        });
                    }}
                />
            )}
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) setTyped('');
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting this user will permanently remove all their data,
                            including notes, entries, and settings. This action cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-user'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-user'
                                type='text'
                                placeholder={`Type "${user?.username || 'DELETE'}" to confirm`}
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                            />
                        </Field>
                    </FieldGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => deleteUser.mutate()}
                            disabled={typed !== (user?.username || 'DELETE')}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
