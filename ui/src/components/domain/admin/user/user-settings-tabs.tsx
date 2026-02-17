import ConfirmDeletionDialog from '@/components/dialogs/base/confirm-deletion-dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/use-api';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { UserRetrieve } from '@/services/cradle/models';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import bytes from 'bytes';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import ActiveSessions from '../../user/active-sessions';
import SetUserPasswordDialog from './set-password-dialog';
import UserActivityList from './user-activity-list';
import AdminPanelUserPermissions from './user-permissions';

interface AdminUserSettingsProps {
    userId: string;
    activeTab?: string;
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

    const queryClient = useQueryClient();
    const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
    const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
    const [user, setUser] = useState<UserRetrieve | null>(null);

    const previousValuesRef = useRef<Partial<AdminUserFormData> | null>(null);

    const saveMutation = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            await usersApi.usersUpdate({
                userId,
                userUpdateRequest: payload,
            });
        },
        meta: {
            successMessage: 'User settings saved successfully',
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
        reset,
        getValues,
        control,
        formState: { isDirty },
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
                payload.fileUploadLimitOverride = null;
            }
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        const targetUserId = data.id;
        saveMutation.mutate(
            { userId: targetUserId, payload },
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

    const openSetUserPasswordDialog = () => {
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
                        <div className='flex flex-col gap-4'>
                            <FieldGroup className='gap-4'>
                                <Controller
                                    name='username'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='username'
                                                    className='text-sm block'
                                                >
                                                    Username
                                                </FieldLabel>
                                                <FieldDescription>
                                                    User display name across the
                                                    platform
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <div className='w-64 shrink-0 self-start md:self-center'>
                                                <Input
                                                    {...field}
                                                    id='username'
                                                    placeholder='Username'
                                                    aria-invalid={fieldState.invalid}
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
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='email'
                                                    className='text-sm block'
                                                >
                                                    Email
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Used for login and notifications
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <div className='w-64 shrink-0 self-start md:self-center'>
                                                <Input
                                                    {...field}
                                                    id='email'
                                                    type='text'
                                                    placeholder='Email'
                                                    aria-invalid={fieldState.invalid}
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

                                <Field orientation='responsive'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='userId'
                                            className='text-sm block'
                                        >
                                            User ID
                                        </FieldLabel>
                                        <FieldDescription>
                                            Unique identifier for API integrations
                                        </FieldDescription>
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
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
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel className='text-sm block'>
                                                    Role
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Determines access permissions
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <div className='w-64 shrink-0 self-start md:self-center'>
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
                            </FieldGroup>
                        </div>
                    </section>
                )}

                {/* Administrative Settings */}
                {showSection('administrative') && (
                    <section id='administrative'>
                        <div className='flex flex-col gap-4'>
                            <FieldGroup className='gap-4'>
                                <Controller
                                    name='emailConfirmed'
                                    control={control}
                                    render={({ field }) => (
                                        <Field orientation='responsive'>
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='emailConfirmed'
                                                    className='text-sm block mb-0.5'
                                                >
                                                    Email Confirmed
                                                </FieldLabel>
                                                <FieldDescription>
                                                    User's email confirmation status
                                                </FieldDescription>
                                            </FieldContent>
                                            <Switch
                                                id='emailConfirmed'
                                                name={field.name}
                                                data-testid='emailConfirmed-toggle'
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className='self-start md:self-center'
                                            />
                                        </Field>
                                    )}
                                />

                                <Separator />

                                <Controller
                                    name='isActive'
                                    control={control}
                                    render={({ field }) => (
                                        <Field orientation='responsive'>
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='isActive'
                                                    className='text-sm block mb-0.5'
                                                >
                                                    Active
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Disabled accounts cannot log in
                                                </FieldDescription>
                                            </FieldContent>
                                            <Switch
                                                id='isActive'
                                                name={field.name}
                                                data-testid='isActive-toggle'
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className='self-start md:self-center'
                                            />
                                        </Field>
                                    )}
                                />

                                <Separator />

                                <Controller
                                    name='fileUploadLimitOverride'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='fileUploadLimitOverride'
                                                    className='text-sm block'
                                                >
                                                    File Upload Limit Override
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Override global file upload limit
                                                    for this user (e.g., 100MB, 1GB).
                                                    Leave empty to use global default.
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <div className='w-64 shrink-0 self-start md:self-center'>
                                                <Input
                                                    {...field}
                                                    id='fileUploadLimitOverride'
                                                    placeholder='e.g., 100MB, 1GB'
                                                    aria-invalid={fieldState.invalid}
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

                                <Field orientation='responsive'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm block'>
                                            Password
                                        </FieldLabel>
                                        <FieldDescription>
                                            Set a new password for this user
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='self-start md:self-center'
                                        onClick={openSetUserPasswordDialog}
                                    >
                                        Set Password
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </div>
                    </section>
                )}

                {/* Permissions Section */}
                {showSection('permissions') && (
                    <section id='permissions'>
                        <div className='flex flex-col gap-4'>
                            <AdminPanelUserPermissions id={userId} />
                        </div>
                    </section>
                )}

                {/* Activity Section */}
                {showSection('activity') && (
                    <section id='activity'>
                        <div className='flex flex-col gap-4'>
                            <UserActivityList username={user?.username || ''} />
                        </div>
                    </section>
                )}

                {/* Active Sessions Section */}
                {showSection('sessions') && (
                    <section id='sessions'>
                        <div className='flex flex-col gap-4'>
                            <ActiveSessions userId={userId} />
                        </div>
                    </section>
                )}

                {/* User Management Actions Section */}
                {showSection('management') && (
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
                                        onClick={simulateSession}
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
                                        onClick={sendEmailConfirmation}
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
                                        onClick={sendPasswordResetEmail}
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
                                            Permanently remove this user and all their
                                            data
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='destructive'
                                        size='sm'
                                        className='self-start md:self-center'
                                        onClick={openDeleteUserDialog}
                                    >
                                        Delete
                                    </Button>
                                </Field>
                            </FieldGroup>
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
                <SetUserPasswordDialog
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
