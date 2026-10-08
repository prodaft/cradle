import ApiKeyGenerateDialog from '@/components/domain/user/dialogs/api-key-generate-dialog';
import ChangePasswordDialog from '@/components/domain/user/dialogs/change-password-dialog';
import TwoFactorSetupDialog from '@/components/domain/user/dialogs/two-factor-setup-dialog';
import PasswordConfirmField from '@/components/domain/user/password-confirm-field';
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
import { getDisplayMessage, parseAPIError } from '@/utils/api';
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

    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
    const [isTwoFactorOpen, setIsTwoFactorOpen] = useState(false);
    const [isDisableMode, setIsDisableMode] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [password, setPassword] = useState('');

    const changeId = useId();
    const apiKeyId = useId();
    const twoFactorId = useId();
    const deleteId = useId();
    const confirmId = useId();

    const { data: currentUser } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: target } } },
        { enabled: !!target, meta: { suppressNotification: true } },
    );

    useEffect(() => {
        if (currentUser) {
            setIsTwoFactorEnabled(currentUser.two_factor_enabled || false);
        }
    }, [currentUser]);

    const { mutate: deleteAccount, isPending } = useMutation({
        mutationFn: async ({ id, password }: { id: string; password?: string }) => {
            const { error, response } = await fetchClient.DELETE('/users/{user_id}/', {
                params: { path: { user_id: id } },
                ...(password && { body: { password } }),
            } as { params: { path: { user_id: string } } });
            if (error) throw { response, error };
        },
        meta: { suppressNotification: true },
        onError: async (err) => {
            const parsed = await parseAPIError(err);
            toast.error(getDisplayMessage(parsed));
        },
        onSuccess: async () => {
            await logOut();
            router.navigate({ to: '/login', replace: true });
        },
    });

    if (!currentUser) return null;

    const passwordRequired = currentUser.has_password ?? false;
    const isDeleteAllowed = passwordRequired
        ? password.length > 0
        : confirmText === 'DELETE';

    return (
        <>
            <section id='security'>
                <div className='flex flex-col gap-4'>
                    <FieldGroup className='gap-4'>
                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={changeId}
                                >
                                    Password
                                </FieldLabel>
                                <FieldDescription>
                                    Change your account password
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={changeId}
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-center'
                                onClick={() => setIsChangePasswordOpen(true)}
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
                                    htmlFor={apiKeyId}
                                >
                                    API Key
                                </FieldLabel>
                                <FieldDescription>
                                    Generate key for API access
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={apiKeyId}
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-center'
                                onClick={() => setIsApiKeyOpen(true)}
                                title='API Key'
                            >
                                Generate
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={twoFactorId}
                                >
                                    Two-Factor Auth
                                </FieldLabel>
                                <FieldDescription>
                                    Protect your account with one-time codes from an
                                    authenticator app
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={twoFactorId}
                                type='button'
                                variant={isTwoFactorEnabled ? 'destructive' : 'outline'}
                                size='sm'
                                className='self-center'
                                onClick={() => {
                                    setIsDisableMode(isTwoFactorEnabled);
                                    setIsTwoFactorOpen(true);
                                }}
                            >
                                {isTwoFactorEnabled ? 'Disable' : 'Enable'}
                            </Button>
                        </Field>

                        <Separator />

                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel
                                    className='text-sm block mb-0.5'
                                    htmlFor={deleteId}
                                >
                                    Delete Account
                                </FieldLabel>
                                <FieldDescription>
                                    Permanently remove account and data
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                id={deleteId}
                                type='button'
                                variant='destructive'
                                size='sm'
                                className='self-center'
                                onClick={() => setIsDeleteOpen(true)}
                            >
                                Delete
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
            </section>

            <ChangePasswordDialog
                open={isChangePasswordOpen}
                onOpenChange={setIsChangePasswordOpen}
            />
            {currentUser.id && (
                <ApiKeyGenerateDialog
                    open={isApiKeyOpen}
                    onOpenChange={setIsApiKeyOpen}
                    id={currentUser.id}
                    passwordRequired={passwordRequired}
                />
            )}
            <TwoFactorSetupDialog
                open={isTwoFactorOpen}
                onOpenChange={setIsTwoFactorOpen}
                isDisabling={isDisableMode}
                passwordRequired={passwordRequired}
                onSuccess={() => {
                    setIsTwoFactorEnabled((prev) => !prev);
                    toast.success(
                        isDisableMode
                            ? 'Two-Factor Auth has been disabled.'
                            : 'Two-Factor Auth has been enabled.',
                    );
                }}
            />
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) {
                        setConfirmText('');
                        setPassword('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting your account will permanently remove all your data,
                            including notes, entries, and settings. This action cannot
                            be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        {passwordRequired ? (
                            <PasswordConfirmField
                                value={password}
                                onChange={setPassword}
                                disabled={isPending}
                            />
                        ) : (
                            <Field>
                                <FieldLabel htmlFor={confirmId}>
                                    Type below to confirm
                                </FieldLabel>
                                <Input
                                    id={confirmId}
                                    type='text'
                                    placeholder='Type "DELETE" to confirm'
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    disabled={isPending}
                                />
                            </Field>
                        )}
                    </FieldGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={(event) => {
                                event.preventDefault();
                                if (currentUser.id)
                                    deleteAccount({
                                        id: currentUser.id,
                                        password: passwordRequired
                                            ? password
                                            : undefined,
                                    });
                            }}
                            disabled={!isDeleteAllowed || isPending}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
