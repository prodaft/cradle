import useApi from '@/hooks/api/useApi';
import { yupResolver } from '@hookform/resolvers/yup';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { EntryClass, EntryClassTypeEnum } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import AlertBox from '../../../base/Alert/AlertBox';
import FormField from '../../../forms/FormField';
import Selector from '../../../forms/Selector';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface SubtypeOption {
    value: string;
    label: string;
}

interface FileSettingsFormValues {
    autoprocessFiles: boolean;
    md5Subtype: string;
    sha1Subtype: string;
    sha256Subtype: string;
    mimetypePatterns: string;
}

// We define the shape of the files settings object from the API response
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
    autoprocessFiles: Yup.boolean().required(),
    md5Subtype: Yup.string().required('MD5 hash subtype is required'),
    sha1Subtype: Yup.string().required('SHA1 hash subtype is required'),
    sha256Subtype: Yup.string().required('SHA256 hash subtype is required'),
    mimetypePatterns: Yup.string().required('MIME type patterns are required'),
});

export default function FileSettingsForm() {
    const { entriesApi, managementApi } = useApi();
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<FileSettingsFormValues>({
        resolver: yupResolver(fileSettingsSchema),
        defaultValues: {
            autoprocessFiles: true,
            md5Subtype: '',
            sha1Subtype: '',
            sha256Subtype: '',
            mimetypePatterns:
                'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
    });

    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [subtypes, setSubtypes] = useState<SubtypeOption[]>([]);

    const handleReProcessAllFiles = async () => {
        try {
            await managementApi.managementActionsCreate({
                actionName: ManagementActionsCreateActionNameEnum.ReprocessAllFiles,
                requestBody: { action: 'reprocessAllFiles' },
            });
            setAlert({
                show: true,
                message: 'Files are being re-processed',
                color: 'green',
            });
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Failed to re-process files',
                color: 'red',
            });
        }
    };

    // Fetch all entry subtypes for the selectors
    useEffect(() => {
        async function fetchSubtypes() {
            try {
                const entryClasses = await entriesApi.entryClassesList({});
                setSubtypes(
                    entryClasses
                        .filter(
                            (entry: EntryClass) =>
                                entry.type === EntryClassTypeEnum.Artifact,
                        )
                        .map((entry: EntryClass) => ({
                            value: entry.subtype,
                            label: entry.subtype,
                        })),
                );
            } catch (error) {
                console.error('Error fetching subtypes:', error);
                setAlert({
                    show: true,
                    message: 'Failed to fetch entry subtypes',
                    color: 'red',
                });
            }
        }
        fetchSubtypes();
    }, [entriesApi]);

    useEffect(() => {
        async function fetchSettings() {
            try {
                // managementSettingsRetrieve returns { [key: string]: any }
                const settings =
                    (await managementApi.managementSettingsRetrieve()) as FileSettingsResponse;
                // Check if file settings exist in the response
                if (settings.files) {
                    // Convert the array of mimetype patterns to a newline-separated string
                    const mimetypePatternsString = Array.isArray(
                        settings.files.mimetype_patterns,
                    )
                        ? settings.files.mimetype_patterns.join('\n')
                        : settings.files.mimetype_patterns ||
                          'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document';

                    reset({
                        autoprocessFiles: settings.files.autoprocess_files ?? true,
                        md5Subtype: settings.files.md5_subtype || '',
                        sha1Subtype: settings.files.sha1_subtype || '',
                        sha256Subtype: settings.files.sha256_subtype || '',
                        mimetypePatterns: mimetypePatternsString,
                    });
                }
            } catch (error) {
                console.error(error);
                setAlert({
                    show: true,
                    message: 'Failed to fetch file settings',
                    color: 'red',
                });
            }
        }
        fetchSettings();
    }, [reset, managementApi]);

    const onSubmit = async (data: FileSettingsFormValues) => {
        try {
            // Convert the newline-separated string to an array of strings
            const mimetypePatternsArray = data.mimetypePatterns
                .split('\n')
                .filter((pattern) => pattern.trim() !== '');

            await managementApi.managementSettingsCreate({
                requestBody: {
                    files: {
                        autoprocess_files: data.autoprocessFiles,
                        md5_subtype: data.md5Subtype,
                        sha1_subtype: data.sha1Subtype,
                        sha256_subtype: data.sha256Subtype,
                        mimetype_patterns: mimetypePatternsArray,
                    },
                },
            });
            setAlert({
                show: true,
                message: 'File settings updated successfully!',
                color: 'green',
            });
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Error updating file settings',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    File Processing Settings
                </h1>
                <div className='p-8 backdrop-blur-sm rounded-md bg-cradle3 bg-opacity-20'>
                    <Tabs tabClass={TabClasses.PILL}>
                        <Tab title='Settings'>
                            <form
                                onSubmit={handleSubmit(onSubmit)}
                                className='space-y-3'
                            >
                                <div className='w-full mb-4'>
                                    <FormField
                                        type='checkbox'
                                        id='autoprocessFiles'
                                        label='Process Files Automatically'
                                        className='switch switch-ghost-primary'
                                        {...register('autoprocessFiles')}
                                        row={true}
                                    />
                                </div>

                                <div className='w-full mb-4'>
                                    <label className='block text-sm font-medium'>
                                        MD5 Subtype
                                    </label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='md5Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    options={subtypes}
                                                    value={
                                                        subtypes.find(
                                                            (s) =>
                                                                s.value === field.value,
                                                        ) || null
                                                    }
                                                    onChange={(option) =>
                                                        field.onChange(
                                                            option ? option.value : '',
                                                        )
                                                    }
                                                    placeholder='Select MD5 subtype'
                                                    isSearchable={true}
                                                />
                                            )}
                                        />
                                        {errors.md5Subtype && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.md5Subtype.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='w-full mb-4'>
                                    <label className='block text-sm font-medium'>
                                        SHA1 Subtype
                                    </label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='sha1Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    options={subtypes}
                                                    value={
                                                        subtypes.find(
                                                            (s) =>
                                                                s.value === field.value,
                                                        ) || null
                                                    }
                                                    onChange={(option) =>
                                                        field.onChange(
                                                            option ? option.value : '',
                                                        )
                                                    }
                                                    placeholder='Select SHA1 subtype'
                                                    isSearchable={true}
                                                />
                                            )}
                                        />
                                        {errors.sha1Subtype && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.sha1Subtype.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='w-full mb-4'>
                                    <label className='block text-sm font-medium'>
                                        SHA256 Subtype
                                    </label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='sha256Subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    options={subtypes}
                                                    value={
                                                        subtypes.find(
                                                            (s) =>
                                                                s.value === field.value,
                                                        ) || null
                                                    }
                                                    onChange={(option) =>
                                                        field.onChange(
                                                            option ? option.value : '',
                                                        )
                                                    }
                                                    placeholder='Select SHA256 subtype'
                                                    isSearchable={true}
                                                />
                                            )}
                                        />
                                        {errors.sha256Subtype && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.sha256Subtype.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='w-full mb-4'>
                                    <label className='block text-sm font-medium'>
                                        MIME Type Patterns to be Hashed
                                    </label>
                                    <div className='mt-1'>
                                        <textarea
                                            className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                            rows={6}
                                            {...register('mimetypePatterns')}
                                            placeholder='image/*&#10;application/pdf&#10;application/msword'
                                        />
                                        {errors.mimetypePatterns && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.mimetypePatterns.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='flex gap-2'>
                                    <button
                                        type='submit'
                                        className='btn btn-primary btn-block'
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            </form>

                            <div className='mt-2' />
                            <AlertBox alert={alert} />
                        </Tab>
                        <Tab title='Actions'>
                            <div className='flex flex-col gap-2 pt-4'>
                                <button
                                    type='button'
                                    className='btn btn-outline'
                                    onClick={handleReProcessAllFiles}
                                >
                                    Process All Files
                                </button>

                                <AlertBox alert={alert} />
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
