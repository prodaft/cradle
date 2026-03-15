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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import bytes from 'bytes';
import isEqual from 'lodash/isEqual';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import SetUserPasswordDialog from './set-password-dialog';

interface UserAdministrativeFormProps {
    userId: string;
    isOtherAdmin: boolean;
}

const schema = z.object({
    id: z.string().optional(),
    emailConfirmed: z.boolean().optional(),
    isActive: z.boolean().optional(),
    fileUploadLimitOverride: z
        .string()
        .optional()
        .refine(
            (value) => {
                if (!value || value === '') return true;
                return typeof bytes(value) === 'number';
            },
            {
                error: 'Enter a valid size (e.g. 100MB, 1GB) or leave empty to use global default',
            },
        ),
});

type FormData = z.infer<typeof schema>;

const ADMIN_DEFAULTS: Omit<FormData, 'id'> = {
    emailConfirmed: false,
    isActive: false,
    fileUploadLimitOverride: '',
};

export default function UserAdministrativeForm({
    userId,
    isOtherAdmin,
}: UserAdministrativeFormProps) {
    const queryClient = useQueryClient();
    const previousValuesRef = useRef<Partial<FormData> | null>(null);
    const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);

    const { data: userData } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: userId } } },
        { enabled: !!userId, meta: { suppressNotification: true } },
    );

    const saveMutation = useMutation({
        mutationFn: async ({ userId, payload }: { userId: string; payload: any }) => {
            const { error, response } = await fetchClient.PATCH('/users/{user_id}/', {
                params: { path: { user_id: userId } },
                body: payload,
            });
            if (error) throw { response, error };
        },
        meta: { successMessage: 'User settings saved successfully' },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.users.detail(userId),
            });
        },
    });

    const {
        reset,
        getValues,
        watch,
        control,
        formState: { isDirty },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            id: '',
            emailConfirmed: false,
            isActive: false,
            fileUploadLimitOverride: '',
        },
    });

    useEffect(() => {
        if (!userData) return;
        const fileUploadLimitBytes = (userData as any).file_upload_limit_override;
        const data = {
            id: userData.id,
            emailConfirmed: userData.email_confirmed || false,
            isActive: userData.is_active || false,
            fileUploadLimitOverride: fileUploadLimitBytes
                ? bytes.format(fileUploadLimitBytes, { unitSeparator: ' ' })
                : '',
        };
        reset(data);
        previousValuesRef.current = data;
    }, [userData, reset]);

    const handleSave = () => {
        const data = getValues();
        const prev = previousValuesRef.current;
        if (!data.id) return;

        const payload: any = {};
        if (data.emailConfirmed !== prev?.emailConfirmed)
            payload.email_confirmed = data.emailConfirmed;
        if (data.isActive !== prev?.isActive) payload.is_active = data.isActive;
        if (data.fileUploadLimitOverride !== prev?.fileUploadLimitOverride) {
            if (
                data.fileUploadLimitOverride &&
                data.fileUploadLimitOverride.trim() !== ''
            ) {
                payload.file_upload_limit_override = bytes.parse(
                    data.fileUploadLimitOverride,
                );
            } else {
                payload.file_upload_limit_override = null;
            }
        }

        if (Object.keys(payload).length === 0) {
            toast.info('No changes to save');
            return;
        }

        saveMutation.mutate(
            { userId: data.id, payload },
            {
                onSuccess: () => {
                    previousValuesRef.current = { ...prev, ...data };
                },
            },
        );
    };

    const handleRevert = () => {
        if (previousValuesRef.current) reset(previousValuesRef.current);
    };
    const handleDefault = () => {
        reset(
            { ...ADMIN_DEFAULTS, id: userData?.id },
            { keepDefaultValues: true },
        );
    };
    const isAtDefault =
        !!userData &&
        isEqual(
            { ...watch(), id: undefined },
            { ...ADMIN_DEFAULTS, id: undefined },
        );

    const headerContainer =
        typeof document !== 'undefined'
            ? document.getElementById('settings-header-actions')
            : null;

    if (!userData) return null;

    return (
        <>
            {!isOtherAdmin &&
                headerContainer &&
                createPortal(
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!isDirty}
                            onClick={handleRevert}
                            title='Revert'
                        >
                            <ArrowCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={isAtDefault}
                            onClick={handleDefault}
                            title='Default'
                        >
                            <ClockCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='default'
                            size='icon'
                            disabled={saveMutation.isPending || !isDirty}
                            onClick={handleSave}
                            title='Save Settings'
                        >
                            {saveMutation.isPending ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>,
                    headerContainer,
                )}
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
                                        disabled={isOtherAdmin}
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
                                        disabled={isOtherAdmin}
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
                                            Override global file upload limit for this
                                            user (e.g., 100MB, 1GB). Leave empty to use
                                            global default.
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError
                                                id='fileUploadLimitOverride-error'
                                                className='text-sm mt-1'
                                            >
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <div className='w-64 shrink-0 self-start md:self-center'>
                                        <Input
                                            {...field}
                                            id='fileUploadLimitOverride'
                                            placeholder='e.g., 100MB, 1GB'
                                            disabled={isOtherAdmin}
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
                                onClick={() => setSetPasswordDialogOpen(true)}
                                disabled={isOtherAdmin}
                            >
                                Set Password
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
            </section>
            {userData.id && (
                <SetUserPasswordDialog
                    open={setPasswordDialogOpen}
                    onOpenChange={setSetPasswordDialogOpen}
                    userId={userData.id}
                    onSuccess={() => {
                        queryClient.invalidateQueries({
                            queryKey: queryKeys.users.detail(userId),
                        });
                    }}
                />
            )}
        </>
    );
}
