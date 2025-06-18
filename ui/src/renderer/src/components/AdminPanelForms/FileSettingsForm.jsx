import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Tabs, Tab } from '../Tabs/Tabs';
import AlertBox from '../AlertBox/AlertBox';
import Selector from '../Selector/Selector';
import {
    getSettings,
    performAction,
    setSettings,
} from '../../services/managementService/managementService';
import { getEntryClasses } from '../../services/adminService/adminService';
import FormField from '../FormField/FormField';

const fileSettingsSchema = Yup.object().shape({
    autoprocessFiles: Yup.boolean(),
    md5Subtype: Yup.string().required('MD5 hash subtype is required'),
    sha1Subtype: Yup.string().required('SHA1 hash subtype is required'),
    sha256Subtype: Yup.string().required('SHA256 hash subtype is required'),
    mimetypePatterns: Yup.string().required('MIME type patterns are required'),
});

export default function FileSettingsForm() {
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm({
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

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [subtypes, setSubtypes] = useState([]);

    const handleReProcessAllFiles = async () => {
        try {
            const response = await performAction('reprocessAllFiles');
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Files are being re-processed',
                    color: 'green',
                });
            }
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
                const response = await getEntryClasses();
                if (response.status === 200 && response.data) {
                    setSubtypes(
                        response.data
                            .filter((entry) => entry.type === 'artifact')
                            .map((entry) => ({
                                value: entry.subtype,
                                label: entry.subtype,
                            })),
                    );
                }
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
    }, []);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await getSettings();
                if (response.status === 200 && response.data) {
                    // Check if file settings exist in the response
                    if (response.data.files) {
                        // Convert the array of mimetype patterns to a newline-separated string
                        const mimetypePatternsString = Array.isArray(
                            response.data.files.mimetype_patterns,
                        )
                            ? response.data.files.mimetype_patterns.join('\n')
                            : response.data.files.mimetype_patterns ||
                              'image/*\napplication/pdf\napplication/msword\napplication/vnd.openxmlformats-officedocument.wordprocessingml.document';

                        reset({
                            autoprocessFiles:
                                response.data.files.autoprocess_files ?? true,
                            md5Subtype: response.data.files.md5_subtype || '',
                            sha1Subtype: response.data.files.sha1_subtype || '',
                            sha256Subtype: response.data.files.sha256_subtype || '',
                            mimetypePatterns: mimetypePatternsString,
                        });
                    }
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
    }, [reset]);

    const onSubmit = async (data) => {
        try {
            // Convert the newline-separated string to an array of strings
            const mimetypePatternsArray = data.mimetypePatterns
                .split('\n')
                .filter((pattern) => pattern.trim() !== '');

            const response = await setSettings({
                files: {
                    autoprocess_files: data.autoprocessFiles,
                    md5_subtype: data.md5Subtype,
                    sha1_subtype: data.sha1Subtype,
                    sha256_subtype: data.sha256Subtype,
                    mimetype_patterns: mimetypePatternsArray,
                },
            });
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'File settings updated successfully!',
                    color: 'green',
                });
            }
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
                    <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                        <Tab title='Settings'>
                            <form
                                onSubmit={handleSubmit(onSubmit)}
                                className='space-y-3'
                            >
                                <div className='w-full mb-4'>
                                    <FormField
                                        type='checkbox'
                                        id='autoprocessFiles'
                                        labelText='Process Files Automatically'
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
                                            rows='6'
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
