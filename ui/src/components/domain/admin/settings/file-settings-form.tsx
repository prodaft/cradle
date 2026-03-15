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
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query';
import { SelectOption } from '@/types';
import { getSuccessMessage } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowClockwiseIcon,
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import isEqual from 'lodash/isEqual';
import { fetchClient } from '@services/openapi/client';
import { fetchAllEntryClasses } from '@services/openapi/fetch-all-pages';
import { useMutation, useQuery } from '@tanstack/react-query';
import bytes from 'bytes';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

type SubtypeOption = SelectOption<string>;

const isValidBytesString = (value: string) => {
    try {
        const parsed = bytes.parse(value);
        return typeof parsed === 'number' && !Number.isNaN(parsed);
    } catch {
        return false;
    }
};

const fileSettingsSchema = z.object({
    autoprocessFiles: z.boolean().default(true),
    md5Subtype: z
        .object({ value: z.string().min(1), label: z.string().min(1) })
        .nullable()
        .refine((val) => val !== null, {
            error: 'MD5 hash subtype is required',
        }),
    sha1Subtype: z
        .object({ value: z.string().min(1), label: z.string().min(1) })
        .nullable()
        .refine((val) => val !== null, {
            error: 'SHA1 hash subtype is required',
        }),
    sha256Subtype: z
        .object({ value: z.string().min(1), label: z.string().min(1) })
        .nullable()
        .refine((val) => val !== null, {
            error: 'SHA256 hash subtype is required',
        }),
    maxFileSizeForHashing: z
        .string()
        .min(1, { error: 'Maximum file size for hashing is required' })
        .refine(isValidBytesString, { error: 'Enter a valid size (e.g. 10MB, 1GB)' }),
    uploadLimit: z
        .string()
        .min(1, { error: 'Upload limit is required' })
        .refine(isValidBytesString, { error: 'Enter a valid size (e.g. 100MB, 1GB)' }),
});

type FileSettingsFormValues = z.infer<typeof fileSettingsSchema>;

const FILE_SETTINGS_DEFAULTS: FileSettingsFormValues = {
    autoprocessFiles: true,
    md5Subtype: { value: 'hash/md5', label: 'hash/md5' },
    sha1Subtype: { value: 'hash/sha1', label: 'hash/sha1' },
    sha256Subtype: { value: 'hash/sha256', label: 'hash/sha256' },
    maxFileSizeForHashing: '10 MB',
    uploadLimit: '2 GB',
};

interface FileSettingsApi {
    files?: {
        autoprocess_files?: boolean;
        md5_subtype?: string | null;
        sha1_subtype?: string | null;
        sha256_subtype?: string | null;
        max_file_size_for_hashing?: number | null;
        upload_limit?: number | null;
    };
}

function getFileSettingsFromApi(settings: FileSettingsApi | null | undefined): FileSettingsFormValues | null {
    if (!settings?.files) return null;
    const f = settings.files;
    return {
        autoprocessFiles: f.autoprocess_files ?? true,
        md5Subtype: f.md5_subtype
            ? { value: f.md5_subtype, label: f.md5_subtype }
            : null,
        sha1Subtype: f.sha1_subtype
            ? { value: f.sha1_subtype, label: f.sha1_subtype }
            : null,
        sha256Subtype: f.sha256_subtype
            ? { value: f.sha256_subtype, label: f.sha256_subtype }
            : null,
        maxFileSizeForHashing: f.max_file_size_for_hashing
            ? bytes.format(f.max_file_size_for_hashing, { unitSeparator: ' ' })
            : '10 MB',
        uploadLimit: f.upload_limit
            ? bytes.format(f.upload_limit, { unitSeparator: ' ' })
            : '2 GB',
    } as FileSettingsFormValues;
}

export default function FileSettingsForm() {
    const reprocessFilesMutation = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.POST(
                '/management/actions/{action_name}/',
                { params: { path: { action_name: 'reprocess_all_files' } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
        onSuccess: (response) => {
            toast.success(
                getSuccessMessage(response) || 'Action completed successfully!',
            );
        },
    });

    const loadedValuesRef = useRef<FileSettingsFormValues | null>(null);

    const { data: entryClassesData } = useQuery({
        queryKey: ['entry_classes', 'file-settings'],
        queryFn: () => fetchAllEntryClasses(),
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const {
        data: settingsData,
        isLoading,
        isError: isSettingsError,
        error: settingsError,
        refetch: refetchSettings,
    } = useQuery({
        queryKey: queryKeys.management.settings(),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/management/settings/',
            );
            if (error) throw { response, error };
            return data;
        },
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (data: FileSettingsFormValues) => {
            const { error, response } = await fetchClient.POST(
                '/management/settings/',
                {
                    body: {
                        files: {
                            autoprocess_files: data.autoprocessFiles,
                            md5_subtype: data.md5Subtype?.value || null,
                            sha1_subtype: data.sha1Subtype?.value || null,
                            sha256_subtype: data.sha256Subtype?.value || null,
                            max_file_size_for_hashing: data.maxFileSizeForHashing
                                ? bytes.parse(data.maxFileSizeForHashing)
                                : null,
                            upload_limit: data.uploadLimit
                                ? bytes.parse(data.uploadLimit)
                                : null,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.management.settings() }],
            successMessage: 'File settings updated successfully!',
        },
        onSuccess: (_, variables) => {
            loadedValuesRef.current = variables;
            reset(variables);
        },
    });

    const subtypes = useMemo<SubtypeOption[]>(() => {
        const results = entryClassesData ?? [];
        return results
            .filter((entry) => entry.type === 'artifact')
            .map((entry) => ({ value: entry.subtype, label: entry.subtype }));
    }, [entryClassesData]);

    const {
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        control,
        formState: { isDirty },
    } = useForm<FileSettingsFormValues>({
        resolver: zodResolver(fileSettingsSchema) as any,
        defaultValues: FILE_SETTINGS_DEFAULTS,
    });

    useEffect(() => {
        const values = getFileSettingsFromApi(settingsData);
        if (!values) return;
        loadedValuesRef.current = values;
        reset(values);
    }, [settingsData, reset]);

    const onSubmit = (data: FileSettingsFormValues) =>
        updateSettingsMutation.mutateAsync(data);

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (isSettingsError) {
        const message =
            settingsError instanceof Error ? settingsError.message : 'Unknown error';
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <div className='flex flex-col items-center gap-3'>
                    <p className='text-sm text-muted-foreground'>
                        Failed to load file settings. {message}
                    </p>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => refetchSettings()}
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const headerContainer =
        typeof document !== 'undefined'
            ? document.getElementById('settings-header-actions')
            : null;

    const handleRevert = () => {
        if (loadedValuesRef.current) reset(loadedValuesRef.current);
    };
    const handleDefault = () =>
        reset(FILE_SETTINGS_DEFAULTS, { keepDefaultValues: true });
    const isAtDefault = isEqual(watch(), FILE_SETTINGS_DEFAULTS);

    return (
        <>
            {headerContainer &&
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
                            type='submit'
                            form='settings-form'
                            variant='default'
                            size='icon'
                            disabled={updateSettingsMutation.isPending || !isDirty}
                            title='Save Settings'
                        >
                            {updateSettingsMutation.isPending ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>,
                    headerContainer,
                )}
            <form id='settings-form' onSubmit={handleFormSubmit(onSubmit)}>
                <div className='flex flex-col gap-6'>
                    {/* Processing Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Processing</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='autoprocessFiles'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='autoprocessFiles'
                                                className='text-sm block mb-0.5'
                                            >
                                                Autoprocess Files
                                            </FieldLabel>
                                            <FieldDescription>
                                                Automatically process uploaded files
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Switch
                                            id='autoprocessFiles'
                                            name={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='self-start md:self-center'
                                        />
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='md5Subtype'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                MD5 Subtype
                                            </FieldLabel>
                                            <FieldDescription>
                                                Entry class for MD5 hash artifacts
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='md5Subtype-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Select
                                            value={field.value?.value || ''}
                                            onValueChange={(value) => {
                                                const option = subtypes.find(
                                                    (opt) => opt.value === value,
                                                );
                                                field.onChange(
                                                    option
                                                        ? {
                                                              value: option.value,
                                                              label: option.label,
                                                          }
                                                        : null,
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className='self-start md:self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'md5Subtype-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder='Select MD5 subtype' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subtypes.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='sha1Subtype'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                SHA1 Subtype
                                            </FieldLabel>
                                            <FieldDescription>
                                                Entry class for SHA1 hash artifacts
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='sha1Subtype-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Select
                                            value={field.value?.value || ''}
                                            onValueChange={(value) => {
                                                const option = subtypes.find(
                                                    (opt) => opt.value === value,
                                                );
                                                field.onChange(
                                                    option
                                                        ? {
                                                              value: option.value,
                                                              label: option.label,
                                                          }
                                                        : null,
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className='self-start md:self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'sha1Subtype-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder='Select SHA1 subtype' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subtypes.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='sha256Subtype'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                SHA256 Subtype
                                            </FieldLabel>
                                            <FieldDescription>
                                                Entry class for SHA256 hash artifacts
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='sha256Subtype-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Select
                                            value={field.value?.value || ''}
                                            onValueChange={(value) => {
                                                const option = subtypes.find(
                                                    (opt) => opt.value === value,
                                                );
                                                field.onChange(
                                                    option
                                                        ? {
                                                              value: option.value,
                                                              label: option.label,
                                                          }
                                                        : null,
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className='self-start md:self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'sha256Subtype-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder='Select SHA256 subtype' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subtypes.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='maxFileSizeForHashing'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='maxFileSizeForHashing'
                                                className='text-sm block mb-0.5'
                                            >
                                                Maximum File Size for Hashing
                                            </FieldLabel>
                                            <FieldDescription>
                                                Maximum file size for hashing
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='maxFileSizeForHashing-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='maxFileSizeForHashing'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'maxFileSizeForHashing-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='uploadLimit'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='uploadLimit'
                                                className='text-sm block mb-0.5'
                                            >
                                                Upload Limit
                                            </FieldLabel>
                                            <FieldDescription>
                                                Maximum file size allowed for uploads
                                                (per user limit can override this)
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='uploadLimit-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='uploadLimit'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'uploadLimit-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>
                    {/* Actions Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Actions</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Field orientation='responsive'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel className='text-sm block mb-0.5'>
                                        Process All Files
                                    </FieldLabel>
                                    <FieldDescription>
                                        Re-process all files with current settings
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-start md:self-center'
                                    onClick={() => reprocessFilesMutation.mutate()}
                                    disabled={reprocessFilesMutation.isPending}
                                >
                                    <ArrowClockwiseIcon
                                        className='w-3.5 h-3.5'
                                        weight='bold'
                                    />
                                    {reprocessFilesMutation.isPending
                                        ? 'Processing\u2026'
                                        : 'Process'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </div>
                </div>
            </form>
        </>
    );
}
