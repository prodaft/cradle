import PageHeader from '@/components/base/PageHeader';
import AdminSetPasswordModal from '@/components/modals/admin/AdminSetPasswordModal';
import ConfirmDeletionModal from '@/components/modals/base/ConfirmDeletionModal';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
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
import { SettingsButton, SettingsCard, SettingsField } from '@components/forms';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import bytes from 'bytes';
import { WarningCircle } from 'iconoir-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import ActiveSessions from '../../user/ActiveSessions';

interface AdminUserSettingsProps {
    userId: string;
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

export default function AdminUserSettings({ userId }: AdminUserSettingsProps) {
    const router = useRouter();
    const { usersApi } = useApi();
    const { setTokensDirectly } = useAuthActions();
    const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
    const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false);

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
            router.navigate({ to: '/manage/users' });
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

    const openDeleteUserModal = () => {
        setDeleteUserModalOpen(true);
    };

    const openAdminSetPasswordModal = () => {
        const id = getValues('id');
        if (!id) return;
        setSetPasswordModalOpen(true);
    };

    if (!user) return <div></div>;

    return (
        <div className='w-full h-full flex flex-col'>
            <PageHeader
                title={`User Settings: ${user.username || 'Loading...'}`}
                description='Manage user account and administrative settings'
            />

            <div className='p-5 flex-1'>
                <div className='w-full'>
                    <form onSubmit={(e) => e.preventDefault()}>
                        {/* Account Section - Basic Information First */}
                        <section id='account' className='pb-8'>
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
                                            <WarningCircle />
                                            <AlertDescription>
                                                {alert.message}
                                            </AlertDescription>
                                        </AlertComponent>
                                    </div>
                                )}

                                {/* Basic Information Card */}
                                <SettingsCard>
                                    <SettingsField
                                        label='Username'
                                        description='User display name across the platform'
                                        placeholder='Username'
                                        {...register('username')}
                                        error={errors.username}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Email'
                                        description='Used for login and notifications'
                                        type='text'
                                        placeholder='Email'
                                        {...register('email')}
                                        error={errors.email}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='User ID'
                                        description='Unique identifier for API integrations'
                                    >
                                        <Input
                                            type='text'
                                            value={user?.id || ''}
                                            className='opacity-60'
                                            disabled
                                            readOnly
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='Role'
                                        description='Determines access permissions'
                                        error={errors.role}
                                    >
                                        <Controller
                                            name='role'
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger className='w-full'>
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
                                            )}
                                        />
                                    </SettingsField>
                                </SettingsCard>

                                {/* Administrative Settings */}
                                <section
                                    id='administrative'
                                    className='border-t border-white/5 pt-5'
                                >
                                    <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                        Administrative
                                    </h2>
                                    <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                        Manage user permissions and settings
                                    </p>

                                    <SettingsCard>
                                        <div className='py-2'>
                                            <div className='flex items-center justify-between gap-4'>
                                                <div className='flex-1'>
                                                    <Label
                                                        htmlFor='emailConfirmed'
                                                        className='text-sm text-muted-foreground block mb-0.5'
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
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
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
                                                        className='text-sm text-muted-foreground block mb-0.5'
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
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <Separator />

                                        <SettingsField
                                            label='File Upload Limit Override'
                                            description='Override global file upload limit for this user (e.g., 100MB, 1GB). Leave empty to use global default.'
                                            placeholder='e.g., 100MB, 1GB'
                                            {...register('fileUploadLimitOverride')}
                                            error={errors.fileUploadLimitOverride}
                                        />

                                        <Separator />

                                        <SettingsButton
                                            label='Password'
                                            description='Set a new password for this user'
                                            buttonText='Set Password'
                                            onClick={openAdminSetPasswordModal}
                                        />
                                    </SettingsCard>
                                </section>

                                {/* Active Sessions Section */}
                                <section
                                    id='sessions'
                                    className='border-t border-white/5 pt-5'
                                >
                                    <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                        Active Sessions
                                    </h2>
                                    <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                        View and manage active user sessions
                                    </p>

                                    <ActiveSessions userId={userId} />
                                </section>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className='flex justify-start pt-4'>
                            <Button
                                type='button'
                                onClick={handleSave}
                                disabled={saveMutation.isPending || !isDirty}
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>

                    {/* User Management Actions Section */}
                    <section
                        id='admin-actions'
                        className='border-t border-white/5 pt-8 pb-8'
                    >
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            User Management
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Administrative actions for this user
                        </p>

                        <div className='space-y-4'>
                            <SettingsCard>
                                <SettingsButton
                                    label='Simulate Session'
                                    description='Jump into a session for this user'
                                    buttonText='Simulate'
                                    onClick={simulateSession}
                                />

                                <Separator />

                                <SettingsButton
                                    label='Email Confirmation'
                                    description='Send email verification to user'
                                    buttonText='Send Email'
                                    onClick={sendEmailConfirmation}
                                />

                                <Separator />

                                <SettingsButton
                                    label='Password Reset'
                                    description='Send password reset email'
                                    buttonText='Send Reset'
                                    onClick={sendPasswordResetEmail}
                                />

                                <Separator />

                                <SettingsButton
                                    label='Delete User'
                                    description='Permanently remove this user and all their data'
                                    buttonText='Delete'
                                    variant='danger'
                                    onClick={openDeleteUserModal}
                                />
                            </SettingsCard>
                        </div>
                    </section>
                </div>
            </div>
            <ConfirmDeletionModal
                open={deleteUserModalOpen}
                onOpenChange={setDeleteUserModalOpen}
                onConfirm={handleDeleteUser}
                confirmText={getValues('username') || 'DELETE'}
                text='Deleting this user will permanently remove all their data, including notes, entries, and settings. This action cannot be undone.'
            />
            {getValues('id') && (
                <AdminSetPasswordModal
                    open={setPasswordModalOpen}
                    onOpenChange={setSetPasswordModalOpen}
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
