import AdminSetPasswordDialog from '@/components/dialogs/admin/AdminSetPasswordDialog';
import ConfirmDeletionDialog from '@/components/dialogs/base/ConfirmDeletionDialog';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { UserRetrieve } from '@/services/cradle/models';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import bytes from 'bytes';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import ActiveSessions from '../../user/ActiveSessions';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions';
import UserActivityList from '../UserActivityList';

interface AdminUserSettingsProps {
    userId: string;
    activeTab?: string;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

const adminUserSettingsSchema = z.object({
    id: z.string().optional(),
    username: z.string().min(1, { error: 'Username is required' }),
    email: z
        .string()
        .min(1, { error: 'Email is required' })
        .refine((val) => z.email().safeParse(val).success, {
            error: 'Invalid email',
        }),
    role: z.string().min(1, { error: 'Role is required' }),
    emailConfirmed: z.boolean().optional(),
    isActive: z.boolean().optional(),
    fileUploadLimitOverride: z
        .string()
        .optional()
        .refine(
            (value) => {
                if (!value || value === '') return true; // Allow empty to use global default
                return typeof bytes(value) === 'number';
            },
            {
                error: 'Enter a valid size (e.g. 100MB, 1GB) or leave empty to use global default',
            },
        ),
});

type AdminUserFormData = z.infer<typeof adminUserSettingsSchema>;

export default function AdminUserSettings({
    userId,
    activeTab = 'account',
}: AdminUserSettingsProps) {
    const router = useRouter();
    const { usersApi } = useApi();
    const { setTokensDirectly } = useAuthActions();
    const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
    const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);

    const saveMutation = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            await usersApi.usersUpdate({
                userId,
                userUpdateRequest: payload,
            });
        },
        meta: {
            successMessage: 'User settings saved successfully',
            errorMessage: 'Failed to save user settings',
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(userId),
            });
        },
    });

    const simulateSessionMutation = useMutation({
        mutationFn: async () => {
            return await usersApi.usersManageRetrieve({
                userId,
                actionName: 'simulate',
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (res) => {
            setTokensDirectly(res as any);
            router.navigate({ to: '/', replace: true });
        },
    });

    const sendEmailConfirmationMutation = useMutation({
        mutationFn: async () => {
            await usersApi.usersManageRetrieve({
                userId,
                actionName: 'send_email_confirmation',
            });
        },
        meta: {
            successMessage: 'Email confirmation sent successfully',
        },
    });

    const sendPasswordResetEmailMutation = useMutation({
        mutationFn: async () => {
            await usersApi.usersManageRetrieve({
                userId,
                actionName: 'password_reset_email',
            });
        },
        meta: {
            successMessage: 'Password reset email sent successfully',
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async () => {
            await usersApi.usersDestroy({ userId });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('User deleted successfully');
            router.navigate({ to: '/manage/users' } as any);
        },
    });
    const queryClient = useQueryClient();
    const [user, setUser] = useState<UserRetrieve | null>(null);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const previousValuesRef = useRef<Partial<AdminUserFormData> | null>(null);

    const defaultValues: AdminUserFormData = {
        id: '',
        username: '',
        email: '',
        role: 'author',
        emailConfirmed: false,
        isActive: false,
        fileUploadLimitOverride: '',
    };

    const {
        register,
        handleSubmit,
        reset,
        getValues,
        watch,
        control,
        formState: { errors, isDirty },
    } = useForm<AdminUserFormData>({
        resolver: zodResolver(adminUserSettingsSchema) as any,
        defaultValues,
    });

    // Query for user data
    const { data: userData } = useQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn: () => usersApi.usersRetrieve({ userId }),
        enabled: !!userId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Populate form when user data is loaded
    useEffect(() => {
        if (!userData || !userId) {
            setUser(null);
            return;
        }

        setUser(userData);

        const fileUploadLimitBytes = (userData as any).fileUploadLimitOverride;
        const fileUploadLimitFormatted = fileUploadLimitBytes
            ? bytes.format(fileUploadLimitBytes, { unitSeparator: ' ' })
            : '';

        const initialData = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role || 'author',
            emailConfirmed: userData.emailConfirmed || false,
            isActive: userData.isActive || false,
            fileUploadLimitOverride: fileUploadLimitFormatted,
        };

        reset(initialData);
        previousValuesRef.current = initialData;
    }, [userData, userId, reset]);

    const handleSave = async () => {
        const data = getValues();
        const previousData = previousValuesRef.current;

        if (!data.id) return;

        const hasChanges =
            data.username !== previousData?.username ||
            data.email !== previousData?.email ||
            data.role !== previousData?.role ||
            data.emailConfirmed !== previousData?.emailConfirmed ||
            data.isActive !== previousData?.isActive ||
            data.fileUploadLimitOverride !== previousData?.fileUploadLimitOverride;

        if (!hasChanges) {
            toast.info('No changes to save');
            return;
        }

        const payload: any = {};
        if (data.username !== previousData?.username) payload.username = data.username;
        if (data.email !== previousData?.email) payload.email = data.email;
        if (data.emailConfirmed !== previousData?.emailConfirmed)
            payload.emailConfirmed = data.emailConfirmed;
        if (data.isActive !== previousData?.isActive) payload.isActive = data.isActive;
        if (data.role !== previousData?.role) payload.role = data.role;
        if (data.fileUploadLimitOverride !== previousData?.fileUploadLimitOverride) {
            if (
                data.fileUploadLimitOverride &&
                data.fileUploadLimitOverride.trim() !== ''
            ) {
                payload.fileUploadLimitOverride = bytes.parse(
                    data.fileUploadLimitOverride,
                );
            } else {
                payload.file_upload_limit = null;
            }
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        if (!data.id) {
            return;
        }
        const userId = data.id;
        saveMutation.mutate(
            { userId, payload },
            {
                onSuccess: () => {
                    previousValuesRef.current = {
                        ...previousData,
                        ...data,
                    };
                },
            },
        );
    };

    // Admin actions
    const simulateSession = () => {
        simulateSessionMutation.mutate();
    };

    const sendEmailConfirmation = () => {
        sendEmailConfirmationMutation.mutate();
    };

    const sendPasswordResetEmail = () => {
        sendPasswordResetEmailMutation.mutate();
    };

    const handleDeleteUser = () => {
        deleteUserMutation.mutate();
    };

    const openDeleteUserDialog = () => {
        setDeleteUserDialogOpen(true);
    };

    const openAdminSetPasswordDialog = () => {
        const id = getValues('id');
        if (!id) return;
        setSetPasswordDialogOpen(true);
    };

    if (!user) return <div></div>;

    const showSection = (sectionId: string) => {
        if (!activeTab) return true;
        return activeTab === sectionId;
    };

    return (
        <div className='w-full h-full flex flex-col'>
            <form onSubmit={(e) => e.preventDefault()}>
                {/* Account Section - Basic Information First */}
                {showSection('account') && (
                    <section id='account'>
                        <div className='space-y-4'>
                            {/* Alert */}
                            {alert.show && (
                                <div className='pt-4'>
                                    <AlertComponent
                                        variant={
                                            alert.color === 'red' ||
                                            alert.color === 'error'
                                                ? 'destructive'
                                                : 'default'
                                        }
                                    >
                                        <WarningCircleIcon size={18} weight='bold' />
                                        <AlertDescription>
                                            {alert.message}
                                        </AlertDescription>
                                    </AlertComponent>
                                </div>
                            )}

                            {/* Basic Information Card */}
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <Controller
                                        name='username'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='username'
                                                        className='text-sm text-muted-foreground block'
                                                    >
                                                        Username
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        User display name across the
                                                        platform
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto self-center'>
                                                    <Input
                                                        {...field}
                                                        id='username'
                                                        placeholder='Username'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'username-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Controller
                                        name='email'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='email'
                                                        className='text-sm text-muted-foreground block'
                                                    >
                                                        Email
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Used for login and notifications
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto self-center'>
                                                    <Input
                                                        {...field}
                                                        id='email'
                                                        type='text'
                                                        placeholder='Email'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'email-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='userId'
                                                className='text-sm text-muted-foreground block'
                                            >
                                                User ID
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Unique identifier for API integrations
                                            </FieldDescription>
                                        </FieldContent>
                                        <div className='w-auto self-center'>
                                            <Input
                                                id='userId'
                                                type='text'
                                                value={user?.id || ''}
                                                className='opacity-60'
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </Field>

                                    <Separator />

                                    <Controller
                                        name='role'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel className='text-sm text-muted-foreground block'>
                                                        Role
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Determines access permissions
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto self-center'>
                                                    <Select
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger
                                                            className='w-full sm:w-64'
                                                            aria-invalid={
                                                                fieldState.invalid
                                                            }
                                                            aria-describedby={
                                                                fieldState.invalid
                                                                    ? 'role-error'
                                                                    : undefined
                                                            }
                                                        >
                                                            <SelectValue placeholder='Select a role' />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value='author'>
                                                                User
                                                            </SelectItem>
                                                            <SelectItem value='entrymanager'>
                                                                Entry Manager
                                                            </SelectItem>
                                                            <SelectItem value='admin'>
                                                                Admin
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </Field>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* Administrative Settings */}
                {showSection('administrative') && (
                    <section id='administrative'>
                        <div className='space-y-4'>
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label
                                                    htmlFor='emailConfirmed'
                                                    className='text-sm text-muted-foreground block'
                                                >
                                                    Email Confirmed
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    User's email confirmation status
                                                </p>
                                            </div>
                                            <Controller
                                                name='emailConfirmed'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='emailConfirmed'
                                                        name={field.name}
                                                        data-testid='emailConfirmed-toggle'
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label
                                                    htmlFor='isActive'
                                                    className='text-sm text-muted-foreground block'
                                                >
                                                    Active
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Disabled accounts cannot log in
                                                </p>
                                            </div>
                                            <Controller
                                                name='isActive'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='isActive'
                                                        name={field.name}
                                                        data-testid='isActive-toggle'
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <Controller
                                        name='fileUploadLimitOverride'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='fileUploadLimitOverride'
                                                        className='text-sm text-muted-foreground block'
                                                    >
                                                        File Upload Limit Override
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Override global file upload
                                                        limit for this user (e.g.,
                                                        100MB, 1GB). Leave empty to use
                                                        global default.
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto self-center'>
                                                    <Input
                                                        {...field}
                                                        id='fileUploadLimitOverride'
                                                        placeholder='e.g., 100MB, 1GB'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'fileUploadLimitOverride-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block'>
                                                Password
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Set a new password for this user
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={openAdminSetPasswordDialog}
                                        >
                                            Set Password
                                        </Button>
                                    </Field>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* Permissions Section */}
                {showSection('permissions') && (
                    <section id='permissions'>
                        <div className='space-y-4'>
                            <AdminPanelUserPermissions id={userId} />
                        </div>
                    </section>
                )}

                {/* Activity Section */}
                {showSection('activity') && (
                    <section id='activity'>
                        <div className='space-y-4'>
                            <UserActivityList username={user?.username || ''} />
                        </div>
                    </section>
                )}

                {/* Active Sessions Section */}
                {showSection('sessions') && (
                    <section id='sessions'>
                        <div className='space-y-4'>
                            <ActiveSessions userId={userId} />
                        </div>
                    </section>
                )}

                {/* User Management Actions Section */}
                {showSection('management') && (
                    <section id='admin-actions'>
                        <div className='space-y-4'>
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block'>
                                                Simulate Session
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Jump into a session for this user
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            className='self-center'
                                            onClick={simulateSession}
                                        >
                                            Simulate
                                        </Button>
                                    </Field>

                                    <Separator />

                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block'>
                                                Email Confirmation
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Send email verification to user
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            className='self-center'
                                            onClick={sendEmailConfirmation}
                                        >
                                            Send Email
                                        </Button>
                                    </Field>

                                    <Separator />

                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block'>
                                                Password Reset
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Send password reset email
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            className='self-center'
                                            onClick={sendPasswordResetEmail}
                                        >
                                            Send Reset
                                        </Button>
                                    </Field>

                                    <Separator />

                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block'>
                                                Delete User
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Permanently remove this user and all
                                                their data
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='sm'
                                            className='self-center'
                                            onClick={openDeleteUserDialog}
                                        >
                                            Delete
                                        </Button>
                                    </Field>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* Save Button */}
                {(showSection('account') || showSection('administrative')) && (
                    <div className='flex justify-end pt-4'>
                        <Button
                            type='button'
                            onClick={handleSave}
                            disabled={saveMutation.isPending || !isDirty}
                        >
                            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}
            </form>
            <ConfirmDeletionDialog
                open={deleteUserDialogOpen}
                onOpenChange={setDeleteUserDialogOpen}
                onConfirm={handleDeleteUser}
                confirmText={getValues('username') || 'DELETE'}
                text='Deleting this user will permanently remove all their data, including notes, entries, and settings. This action cannot be undone.'
            />
            {getValues('id') && (
                <AdminSetPasswordDialog
                    open={setPasswordDialogOpen}
                    onOpenChange={setSetPasswordDialogOpen}
                    userId={getValues('id')!}
                    onSuccess={() => {
                        queryClient.invalidateQueries({
                            queryKey: queryKeys.users.detail(userId),
                        });
                    }}
                />
            )}
        </div>
    );
}
