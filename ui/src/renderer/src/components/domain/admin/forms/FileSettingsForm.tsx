import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { EntryClass, EntryClassTypeEnum } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import {
    FormAlert,
    FormAlertState,
    SelectOption,
    SettingsButton,
    SettingsCard,
    SettingsSeparator,
    SettingsTextArea,
    SettingsToggle,
} from '../../../forms';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { Refresh } from 'iconoir-react';
import Selector from '../../../forms/Selector';

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FileSettingsFormValues {
    autoprocessFiles: boolean;
    md5Subtype: SubtypeOption | null;
    sha1Subtype: SubtypeOption | null;
    sha256Subtype: SubtypeOption | null;
    mimetypePatterns: string;
}

interface FileSettingsResponse {
    files?: {
        autoprocess_files?: boolean;
        md5_subtype?: string;
        sha1_subtype?: string;
        sha256_subtype?: string;
        mimetype_patterns?: string[] | string;
    };
}

const fileSettingsSchema = Yup.object().shape({
    autoprocessFiles: Yup.boolean().default(true),
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
    mimetypePatterns: Yup.string().required('MIME type patterns are required'),
});

export default function FileSettingsForm() {
    const { entriesApi, managementApi } = useApi();
    const { execute } = useAPICall();
    const { notify } = useNotif();

    const [isLoading, setIsLoading] = useState(true);
    const [subtypes, setSubtypes] = useState<SubtypeOption[]>([]);
    const [actionAlert, setActionAlert] = useState<FormAlertState>({
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
            mimetypePatterns:
                'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
                    .filter(
                        (entry: EntryClass) =>
                            entry.type === EntryClassTypeEnum.Artifact,
                    )
                    .map((entry: EntryClass) => ({
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
                    const mimetypePatternsString = Array.isArray(
                        settings.files.mimetype_patterns,
                    )
                        ? settings.files.mimetype_patterns.join('\n')
                        : settings.files.mimetype_patterns ||
                          'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
                        mimetypePatterns: mimetypePatternsString,
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
            const mimetypePatternsArray = data.mimetypePatterns
                .split('\n')
                .filter((pattern) => pattern.trim() !== '');

            await managementApi.managementSettingsCreate({
                requestBody: {
                    files: {
                        autoprocess_files: data.autoprocessFiles,
                        md5_subtype: data.md5Subtype?.value || '',
                        sha1_subtype: data.sha1Subtype?.value || '',
                        sha256_subtype: data.sha256Subtype?.value || '',
                        mimetype_patterns: mimetypePatternsArray,
                    },
                },
            });
            notify({
                type: 'success',
                text: 'File settings updated successfully!',
            });
        } catch (error) {
            notify({
                type: 'error',
                text: 'Failed to save settings',
            });
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
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        File Settings
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Configure file processing and hash generation
                    </p>
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
                                    <SettingsToggle
                                        label='Autoprocess Files'
                                        description='Automatically process uploaded files'
                                        {...register('autoprocessFiles')}
                                        watch={watch}
                                        error={errors.autoprocessFiles}
                                    />

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    MD5 Subtype
                                                </label>
                                                <p className='text-sm cradle-text-muted'>
                                                    Entry class for MD5 hash artifacts
                                                </p>
                                                {errors.md5Subtype && (
                                                    <p className='text-sm text-red-500 mt-1'>
                                                        {errors.md5Subtype.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='w-auto flex-1'>
                                                <Controller
                                                    name='md5Subtype'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Selector
                                                            {...field}
                                                            staticOptions={subtypes}
                                                            placeholder='Select MD5 subtype'
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    SHA1 Subtype
                                                </label>
                                                <p className='text-sm cradle-text-muted'>
                                                    Entry class for SHA1 hash artifacts
                                                </p>
                                                {errors.sha1Subtype && (
                                                    <p className='text-sm text-red-500 mt-1'>
                                                        {errors.sha1Subtype.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='w-auto flex-1'>
                                                <Controller
                                                    name='sha1Subtype'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Selector
                                                            {...field}
                                                            staticOptions={subtypes}
                                                            placeholder='Select SHA1 subtype'
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    SHA256 Subtype
                                                </label>
                                                <p className='text-sm cradle-text-muted'>
                                                    Entry class for SHA256 hash artifacts
                                                </p>
                                                {errors.sha256Subtype && (
                                                    <p className='text-sm text-red-500 mt-1'>
                                                        {errors.sha256Subtype.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='w-auto flex-1'>
                                                <Controller
                                                    name='sha256Subtype'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Selector
                                                            {...field}
                                                            staticOptions={subtypes}
                                                            placeholder='Select SHA256 subtype'
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <SettingsSeparator />

                                    <SettingsTextArea
                                        label='MIME Type Patterns'
                                        description='File types to generate hashes for (one per line)'
                                        rows={6}
                                        placeholder='image/*&#10;application/pdf&#10;application/msword'
                                        {...register('mimetypePatterns')}
                                        error={errors.mimetypePatterns}
                                        layout='vertical'
                                    />
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Actions Section */}
                        <section id='actions' className='border-t border-white/5 pt-5 pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Actions
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Maintenance operations for files
                            </p>

                            <div className='space-y-4'>
                                {actionAlert.type && (
                                    <FormAlert
                                        alert={actionAlert}
                                        onDismiss={() =>
                                            setActionAlert({ type: null, message: '' })
                                        }
                                    />
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
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary px-6 rounded-full'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
