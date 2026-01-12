import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { EntryClassTypeEnum } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import bytes from 'bytes';
import { CheckCircle, InfoCircle, Refresh, WarningCircle } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
    SelectOption,
    SettingsButton,
    SettingsCard,
    SettingsField,
} from '../../../forms';

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FileSettingsResponse {
    files?: {
        autoprocess_files?: boolean;
        md5_subtype?: string;
        sha1_subtype?: string;
        sha256_subtype?: string;
        max_file_size_for_hashing?: number;
        upload_limit?: number;
    };
}

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
        .refine(
            (value) => {
                if (!value) return false;
                return typeof bytes(value) === 'number';
            },
            {
                error: 'Enter a valid size (e.g. 10MB, 1GB)',
            },
        ),
    uploadLimit: z
        .string()
        .min(1, { error: 'Upload limit is required' })
        .refine(
            (value) => {
                if (!value) return false;
                return typeof bytes(value) === 'number';
            },
            {
                error: 'Enter a valid size (e.g. 100MB, 1GB)',
            },
        ),
});

type FileSettingsFormValues = z.infer<typeof fileSettingsSchema>;

export default function FileSettingsForm() {
    const { entriesApi, managementApi } = useApi();

    const reprocessFilesMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: ManagementActionsCreateActionNameEnum.ReprocessAllFiles,
                requestBody: { action: 'reprocessAllFiles' },
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            setActionAlert({
                type: 'success',
                message: 'Files are being re-processed',
            });
        },
        onError: () => {
            setActionAlert({ type: 'error', message: 'Failed to re-process files' });
        },
    });

    const fetchSubtypesMutation = useMutation({
        mutationFn: async () => {
            const entryClasses = await entriesApi.entryClassesList({});
            return entryClasses
                .filter((entry) => entry.type === EntryClassTypeEnum.Artifact)
                .map((entry) => ({
                    value: entry.subtype,
                    label: entry.subtype,
                }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const fetchSettingsMutation = useMutation({
        mutationFn: async () => {
            return await managementApi.managementSettingsRetrieve();
        },
        meta: {
            suppressNotification: true,
        },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (data: FileSettingsFormValues) => {
            await managementApi.managementSettingsCreate({
                requestBody: {
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
            });
        },
        meta: {
            successMessage: 'File settings updated successfully!',
            errorMessage: 'Failed to save file settings',
        },
        onError: () => {
            toast.error('Failed to save file settings');
        },
    });

    const [isLoading, setIsLoading] = useState(true);
    const [subtypes, setSubtypes] = useState<SubtypeOption[]>([]);
    const [actionAlert, setActionAlert] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({
        type: null,
        message: '',
    });

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FileSettingsFormValues>({
        resolver: zodResolver(fileSettingsSchema) as any,
        defaultValues: {
            autoprocessFiles: true,
            md5Subtype: null as any,
            sha1Subtype: null as any,
            sha256Subtype: null as any,
            maxFileSizeForHashing: '10 MB',
            uploadLimit: '2 GB',
        },
    });

    const handleReProcessAllFiles = () => {
        reprocessFilesMutation.mutate();
    };

    // Fetch all entry subtypes for the selectors
    useEffect(() => {
        async function fetchSubtypes() {
            try {
                const artifactSubtypes = await fetchSubtypesMutation.mutateAsync();
                setSubtypes(artifactSubtypes);
            } catch (error) {
                // Error already handled
            }
        }
        fetchSubtypes();
    }, []);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings =
                    (await fetchSettingsMutation.mutateAsync()) as FileSettingsResponse;
                if (settings.files) {
                    reset({
                        autoprocessFiles: settings.files.autoprocess_files ?? true,
                        md5Subtype: settings.files.md5_subtype
                            ? {
                                  value: settings.files.md5_subtype,
                                  label: settings.files.md5_subtype,
                              }
                            : null,
                        sha1Subtype: settings.files.sha1_subtype
                            ? {
                                  value: settings.files.sha1_subtype,
                                  label: settings.files.sha1_subtype,
                              }
                            : null,
                        sha256Subtype: settings.files.sha256_subtype
                            ? {
                                  value: settings.files.sha256_subtype,
                                  label: settings.files.sha256_subtype,
                              }
                            : null,
                        maxFileSizeForHashing: settings.files.max_file_size_for_hashing
                            ? bytes.format(settings.files.max_file_size_for_hashing, {
                                  unitSeparator: ' ',
                              })
                            : '10 MB',
                        uploadLimit: settings.files.upload_limit
                            ? bytes.format(settings.files.upload_limit, {
                                  unitSeparator: ' ',
                              })
                            : '2 GB',
                    } as FileSettingsFormValues);
                }
            } catch (error) {
                // Error already handled by mutation
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [reset]);

    const onSubmit = async (data: FileSettingsFormValues) => {
        updateSettingsMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>File Settings</h2>
                    <p className='text-muted-foreground'>
                        Configure file processing and hash generation
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit as any)}>
                        {/* Processing Section */}
                        <section id='processing' className='pb-8'>
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                Processing
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Configure automatic file processing and hash subtypes
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label
                                                    htmlFor='autoprocessFiles'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Autoprocess Files
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Automatically process uploaded files
                                                </p>
                                                {errors.autoprocessFiles && (
                                                    <p className='text-sm text-destructive mt-1'>
                                                        {
                                                            errors.autoprocessFiles
                                                                .message
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                            <Controller
                                                name='autoprocessFiles'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='autoprocessFiles'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <SettingsField
                                        label='MD5 Subtype'
                                        description='Entry class for MD5 hash artifacts'
                                        error={errors.md5Subtype?.message?.toString()}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='md5Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value?.value || ''}
                                                    onValueChange={(value) => {
                                                        const option = subtypes.find(
                                                            (opt) =>
                                                                opt.value === value,
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
                                                        className='w-72'
                                                        aria-invalid={Boolean(
                                                            errors.md5Subtype,
                                                        )}
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
                                            )}
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='SHA1 Subtype'
                                        description='Entry class for SHA1 hash artifacts'
                                        error={errors.sha1Subtype?.message?.toString()}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='sha1Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value?.value || ''}
                                                    onValueChange={(value) => {
                                                        const option = subtypes.find(
                                                            (opt) =>
                                                                opt.value === value,
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
                                                        className='w-72'
                                                        aria-invalid={Boolean(
                                                            errors.sha1Subtype,
                                                        )}
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
                                            )}
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='SHA256 Subtype'
                                        description='Entry class for SHA256 hash artifacts'
                                        error={errors.sha256Subtype?.message?.toString()}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='sha256Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value?.value || ''}
                                                    onValueChange={(value) => {
                                                        const option = subtypes.find(
                                                            (opt) =>
                                                                opt.value === value,
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
                                                        className='w-72'
                                                        aria-invalid={Boolean(
                                                            errors.sha256Subtype,
                                                        )}
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
                                            )}
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='Maximum File Size for Hashing'
                                        description='Maximum file size for hashing'
                                        {...register('maxFileSizeForHashing')}
                                        error={errors.maxFileSizeForHashing}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Upload Limit'
                                        description='Maximum file size allowed for uploads (per user limit can override this)'
                                        {...register('uploadLimit')}
                                        error={errors.uploadLimit}
                                    />
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Actions Section */}
                        <section
                            id='actions'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                Actions
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Maintenance operations for files
                            </p>

                            <div className='space-y-4'>
                                {actionAlert.type && (
                                    <Alert
                                        variant={
                                            actionAlert.type === 'error'
                                                ? 'destructive'
                                                : 'default'
                                        }
                                    >
                                        {actionAlert.type === 'success' && (
                                            <CheckCircle />
                                        )}
                                        {actionAlert.type === 'error' && (
                                            <WarningCircle />
                                        )}
                                        {actionAlert.type === 'warning' && (
                                            <InfoCircle />
                                        )}
                                        <AlertDescription>
                                            {actionAlert.message}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <SettingsCard>
                                    <SettingsButton
                                        label='Process All Files'
                                        description='Re-process all files with current settings'
                                        buttonText='Process'
                                        icon={<Refresh className='w-3.5 h-3.5' />}
                                        onClick={handleReProcessAllFiles}
                                    />
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <Button
                                type='submit'
                                variant='default'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
