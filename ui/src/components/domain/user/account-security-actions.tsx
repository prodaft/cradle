import ApiKeyGenerateDialog from '@/components/domain/user/dialogs/api-key-generate-dialog';
import ChangePasswordDialog from '@/components/domain/user/dialogs/change-password-dialog';
import TwoFactorSetupDialog from '@/components/domain/user/dialogs/two-factor-setup-dialog';
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
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

interface AccountSecurityActionsProps {
    target?: string;
}

export default function AccountSecurityActions({
    target = 'me',
}: AccountSecurityActionsProps) {
    const { logOut } = useAuthActions();
    const router = useRouter();

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
    const [twoFactorDisabling, setTwoFactorDisabling] = useState(false);
    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
    const [deleteAccountConfirmInput, setDeleteAccountConfirmInput] = useState('');

    const passwordActionId = useId();
    const apiKeyActionId = useId();
    const twoFactorActionId = useId();
    const deleteAccountActionId = useId();
    const confirmDeleteAccountId = useId();

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        { enabled: !!target, meta: { suppressNotification: true } },
    );

    useEffect(() => {
        if (userData) {
            setTwoFactorEnabled(userData.two_factor_enabled || false);
        }
    }, [userData]);

    const deleteAccountMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error, response } = await fetchClient.DELETE('/users/{user_id}/', {
                params: { path: { user_id: userId } },
            });
            if (error) throw { response, error };
        },
        meta: { suppressNotification: true },
        onSuccess: async () => {
            await logOut();
            router.navigate({ to: '/login', replace: true });
        },
    });

    if (!userData) return null;

    return (
        <>
            <section id='security'>
                <div className='flex flex-col gap-4'>
                    <FieldGroup className='gap-4'>
                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={passwordActionId}
                                >
                                    Password
                                </FieldLabel>
                                <FieldDescription>
                                    Change your account password
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={passwordActionId}
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-center'
                                onClick={() => setChangePasswordDialogOpen(true)}
                                title='Change Password'
                            >
                                Change
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={apiKeyActionId}
                                >
                                    API Key
                                </FieldLabel>
                                <FieldDescription>
                                    Generate key for API access
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={apiKeyActionId}
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-center'
                                onClick={() => setApiKeyDialogOpen(true)}
                                title='Generate API Key'
                            >
                                Generate
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={twoFactorActionId}
                                >
                                    Two-Factor Auth
                                </FieldLabel>
                                <FieldDescription>
                                    Protect your account with one-time codes from an
                                    authenticator app
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={twoFactorActionId}
                                type='button'
                                variant={twoFactorEnabled ? 'destructive' : 'outline'}
                                size='sm'
                                className='self-center'
                                onClick={() => {
                                    setTwoFactorDisabling(twoFactorEnabled);
                                    setTwoFactorDialogOpen(true);
                                }}
                            >
                                {twoFactorEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={deleteAccountActionId}
                                >
                                    Delete Account
                                </FieldLabel>
                                <FieldDescription>
                                    Permanently remove account and data
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={deleteAccountActionId}
                                type='button'
                                variant='destructive'
                                size='sm'
                                className='self-center'
                                onClick={() => setDeleteAccountDialogOpen(true)}
                            >
                                Delete
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
            </section>

            <ChangePasswordDialog
                open={changePasswordDialogOpen}
                onOpenChange={setChangePasswordDialogOpen}
            />
            {userData.id && (
                <ApiKeyGenerateDialog
                    open={apiKeyDialogOpen}
                    onOpenChange={setApiKeyDialogOpen}
                    userId={userData.id}
                />
            )}
            <TwoFactorSetupDialog
                open={twoFactorDialogOpen}
                onOpenChange={setTwoFactorDialogOpen}
                isDisabling={twoFactorDisabling}
                onSuccess={() => {
                    setTwoFactorEnabled((prev) => !prev);
                    toast.success(
                        twoFactorDisabling
                            ? 'Two-Factor Auth has been disabled.'
                            : 'Two-Factor Auth has been enabled.',
                    );
                }}
            />
            <AlertDialog
                open={deleteAccountDialogOpen}
                onOpenChange={(open) => {
                    setDeleteAccountDialogOpen(open);
                    if (!open) setDeleteAccountConfirmInput('');
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting your account will permanently remove all your data,
                            including notes, entries, and settings. This action cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor={confirmDeleteAccountId}>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id={confirmDeleteAccountId}
                                type='text'
                                placeholder='Type "DELETE" to confirm'
                                value={deleteAccountConfirmInput}
                                onChange={(e) =>
                                    setDeleteAccountConfirmInput(e.target.value)
                                }
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
                            onClick={() => {
                                if (userData.id)
                                    deleteAccountMutation.mutate(userData.id);
                            }}
                            disabled={deleteAccountConfirmInput !== 'DELETE'}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
