import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { EntryClass, EntryClassTypeEnum } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import {
    Form,
    FormAlert,
    FormAlertState,
    FormSelect,
    FormSwitch,
    FormTextArea,
    SelectOption,
} from '../../../forms';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

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

    const [isLoading, setIsLoading] = useState(true);
    const [subtypes, setSubtypes] = useState<SubtypeOption[]>([]);
    const [actionAlert, setActionAlert] = useState<FormAlertState>({
        type: null,
        message: '',
    });
    const [initialData, setInitialData] = useState<FileSettingsFormValues>({
        autoprocessFiles: true,
        md5Subtype: null,
        sha1Subtype: null,
        sha256Subtype: null,
        mimetypePatterns:
            'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

                    setInitialData({
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
    }, [managementApi]);

    const handleSubmit = async (data: FileSettingsFormValues) => {
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
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    File Processing Settings
                </h1>
                <div className='p-8 backdrop-blur-sm rounded-md bg-cradle3 bg-opacity-20'>
                    <Tabs tabClass={TabClasses.PILL}>
                        <Tab title='Settings'>
                            <Form<FileSettingsFormValues>
                                schema={fileSettingsSchema}
                                defaultValues={initialData}
                                onSubmit={handleSubmit}
                                successMessage='File settings updated successfully!'
                                className='space-y-4'
                            >
                                <FormSwitch<FileSettingsFormValues>
                                    name='autoprocessFiles'
                                    label='Process Files Automatically'
                                />

                                <FormSelect<FileSettingsFormValues, SubtypeOption>
                                    name='md5Subtype'
                                    label='MD5 Subtype'
                                    options={subtypes}
                                    placeholder='Select MD5 subtype'
                                    required
                                />

                                <FormSelect<FileSettingsFormValues, SubtypeOption>
                                    name='sha1Subtype'
                                    label='SHA1 Subtype'
                                    options={subtypes}
                                    placeholder='Select SHA1 subtype'
                                    required
                                />

                                <FormSelect<FileSettingsFormValues, SubtypeOption>
                                    name='sha256Subtype'
                                    label='SHA256 Subtype'
                                    options={subtypes}
                                    placeholder='Select SHA256 subtype'
                                    required
                                />

                                <FormTextArea<FileSettingsFormValues>
                                    name='mimetypePatterns'
                                    label='MIME Type Patterns to be Hashed'
                                    rows={6}
                                    placeholder='image/*&#10;application/pdf&#10;application/msword'
                                    required
                                />

                                <button
                                    type='submit'
                                    className='btn btn-primary btn-block'
                                >
                                    Save Settings
                                </button>
                            </Form>
                        </Tab>
                        <Tab title='Actions'>
                            <div className='flex flex-col gap-4 pt-4'>
                                <FormAlert
                                    alert={actionAlert}
                                    onDismiss={() =>
                                        setActionAlert({ type: null, message: '' })
                                    }
                                />
                                <button
                                    type='button'
                                    className='btn btn-outline'
                                    onClick={handleReProcessAllFiles}
                                >
                                    Process All Files
                                </button>
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
