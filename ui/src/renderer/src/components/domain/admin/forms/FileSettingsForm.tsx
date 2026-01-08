import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { yupResolver } from '@hookform/resolvers/yup';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { EntryClassTypeEnum } from '@services/cradle/models';
import bytes from 'bytes';
import { CheckCircle, InfoCircle, Refresh, WarningCircle } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as Yup from 'yup';
import {
    SelectOption,
    SettingsButton,
    SettingsCard,
    SettingsField,
} from '../../../forms';
import ShadcnSelect from '../../../forms/ShadcnSelect';

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FileSettingsFormValues {
    autoprocessFiles: boolean;
    md5Subtype: SubtypeOption | null;
    sha1Subtype: SubtypeOption | null;
    sha256Subtype: SubtypeOption | null;
    maxFileSizeForHashing: string;
    uploadLimit: string;
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

const fileSettingsSchema: Yup.ObjectSchema<FileSettingsFormValues> = Yup.object().shape(
    {
        autoprocessFiles: Yup.boolean().default(true).required(),
        md5Subtype: Yup.object()
            .shape({ value: Yup.string().required(), label: Yup.string().required() })
            .nullable()
            .required('MD5 hash subtype is required'),
        sha1Subtype: Yup.object()
            .shape({ value: Yup.string().required(), label: Yup.string().required() })
            .nullable()
            .required('SHA1 hash subtype is required'),
        sha256Subtype: Yup.object()
            .shape({ value: Yup.string().required(), label: Yup.string().required() })
            .nullable()
            .required('SHA256 hash subtype is required'),
        maxFileSizeForHashing: Yup.string()
            .required('Maximum file size for hashing is required')
            .test('is-valid-bytes', 'Enter a valid size (e.g. 10MB, 1GB)', (value) => {
                if (!value) return false;
                return typeof bytes(value) === 'number';
            }),
        uploadLimit: Yup.string()
            .required('Upload limit is required')
            .test('is-valid-bytes', 'Enter a valid size (e.g. 100MB, 1GB)', (value) => {
                if (!value) return false;
                return typeof bytes(value) === 'number';
            }),
    },
);

export default function FileSettingsForm() {
    const { entriesApi, managementApi } = useApi();
    const { execute } = useAPICall();

    const [isLoading, setIsLoading] = useState(true);
    const [subtypes, setSubtypes] = useState<SubtypeOption[]>([]);
    const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({
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
        resolver: yupResolver(fileSettingsSchema),
        defaultValues: {
            autoprocessFiles: true,
            md5Subtype: null,
            sha1Subtype: null,
            sha256Subtype: null,
            maxFileSizeForHashing: '10 MB',
            uploadLimit: '2 GB',
        },
    });

    const handleReProcessAllFiles = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName:
                            ManagementActionsCreateActionNameEnum.ReprocessAllFiles,
                        requestBody: { action: 'reprocessAllFiles' },
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Files are being re-processed',
            });
        } catch {
            setActionAlert({ type: 'error', message: 'Failed to re-process files' });
        }
    };

    // Fetch all entry subtypes for the selectors
    useEffect(() => {
        async function fetchSubtypes() {
            try {
                const entryClasses = await entriesApi.entryClassesList({});
                const artifactSubtypes = entryClasses
                    .filter((entry) => entry.type === EntryClassTypeEnum.Artifact)
                    .map((entry) => ({
                        value: entry.subtype,
                        label: entry.subtype,
                    }));
                setSubtypes(artifactSubtypes);
            } catch (error) {
                console.error('Error fetching subtypes:', error);
            }
        }
        fetchSubtypes();
    }, [entriesApi]);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings =
                    (await managementApi.managementSettingsRetrieve()) as FileSettingsResponse;
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
                    });
                }
            } catch (error) {
                console.error('Failed to fetch file settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [managementApi, reset]);

    const onSubmit = async (data: FileSettingsFormValues) => {
        try {
            await managementApi.managementSettingsCreate({
                requestBody: {
                    files: {
                        autoprocess_files: data.autoprocessFiles,
                        md5_subtype: data.md5Subtype?.value || '',
                        sha1_subtype: data.sha1Subtype?.value || '',
                        sha256_subtype: data.sha256Subtype?.value || '',
                        max_file_size_for_hashing: bytes.parse(
                            data.maxFileSizeForHashing,
                        ),
                        upload_limit: bytes.parse(data.uploadLimit),
                    },
                },
            });
            toast.success('File settings updated successfully!');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>File Settings</h2>
                    <p className='text-muted-foreground'>Configure file processing and hash generation</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit)}>
                        {/* Processing Section */}
                        <section id='processing' className='pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Processing
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Configure automatic file processing and hash subtypes
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='autoprocessFiles' className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    Autoprocess Files
                                                </Label>
                                                <p className='text-sm cradle-text-muted'>Automatically process uploaded files</p>
                                                {errors.autoprocessFiles && (
                                                    <p className='text-sm text-red-500 mt-1'>{errors.autoprocessFiles.message}</p>
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
                                                <ShadcnSelect
                                                    staticOptions={subtypes}
                                                    value={field.value}
                                                    placeholder='Select MD5 subtype'
                                                    onChange={(newValue) => {
                                                        field.onChange(newValue);
                                                    }}
                                                />
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
                                                <ShadcnSelect
                                                    staticOptions={subtypes}
                                                    value={field.value}
                                                    placeholder='Select SHA1 subtype'
                                                    onChange={(newValue) => {
                                                        field.onChange(newValue);
                                                    }}
                                                />
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
                                                <ShadcnSelect
                                                    staticOptions={subtypes}
                                                    value={field.value}
                                                    placeholder='Select SHA256 subtype'
                                                    onChange={(newValue) => {
                                                        field.onChange(newValue);
                                                    }}
                                                />
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

                                    <SettingsSeparator />

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
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Actions
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Maintenance operations for files
                            </p>

                            <div className='space-y-4'>
                                {actionAlert.type && (
                                    <Alert variant={actionAlert.type === 'error' ? 'destructive' : 'default'}>
                                        {actionAlert.type === 'success' && <CheckCircle />}
                                        {actionAlert.type === 'error' && <WarningCircle />}
                                        {actionAlert.type === 'warning' && <InfoCircle />}
                                        <AlertDescription>{actionAlert.message}</AlertDescription>
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
