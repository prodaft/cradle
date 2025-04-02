import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { Tabs, Tab } from '../Tabs/Tabs';
import {
    getSettings,
    setSettings,
    performAction,
} from '../../services/managementService/managementService';

const noteSettingsSchema = Yup.object().shape({
    minEntries: Yup.number()
        .typeError('Must be a number')
        .required('Minimum number of entries is required')
        .min(1, 'Must be at least 1'),
    minEntities: Yup.number()
        .typeError('Must be a number')
        .required('Minimum number of entities is required')
        .min(1, 'Must be at least 1'),
    maxCliqueSize: Yup.number()
        .typeError('Must be a number')
        .required('Maximum clique size is required')
        .min(1, 'Must be at least 1'),
    allowDynamicEntryClassCreation: Yup.boolean(),
});

export default function NoteSettingsForm() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(noteSettingsSchema),
        defaultValues: {
            minEntries: 1,
            minEntities: 1,
            maxCliqueSize: 1,
            allowDynamicEntryClassCreation: false,
        },
    });

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await getSettings();
                if (response.status === 200 && response.data) {
                    reset({
                        minEntries: response.data.notes.min_entries || 1,
                        minEntities: response.data.notes.min_entities || 1,
                        maxCliqueSize: response.data.notes.max_clique_size || 1,
                        allowDynamicEntryClassCreation:
                            response.data.notes.allow_dynamic_entry_class_creation ??
                            false,
                    });
                }
            } catch (error) {
                console.error(error);
                setAlert({
                    show: true,
                    message: 'Failed to fetch settings',
                    color: 'red',
                });
            }
        }
        fetchSettings();
    }, [reset]);

    const onSubmit = async (data) => {
        try {
            const response = await setSettings({
                notes: {
                    min_entries: data.minEntries,
                    min_entities: data.minEntities,
                    max_clique_size: data.maxCliqueSize,
                    allow_dynamic_entry_class_creation:
                        data.allowDynamicEntryClassCreation,
                },
            });
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Settings updated successfully!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Error updating settings',
                color: 'red',
            });
        }
    };

    const handleReLinkNotes = async () => {
        try {
            const response = await performAction('relinkNotes');
            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Re-Link all Notes action triggered!',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error(error);
            setAlert({
                show: true,
                message: 'Failed to re-link notes',
                color: 'red',
            });
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    Note Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                        <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                            <Tab title='Settings'>
                                <div className='flex flex-col gap-3 pt-2'>
                                    <FormField
                                        type='number'
                                        name='minEntries'
                                        labelText='Minimum Number of Entries in a Note'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('minEntries')}
                                        error={errors.minEntries?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='minEntities'
                                        labelText='Minimum Number of Entities in a Note'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('minEntities')}
                                        error={errors.minEntities?.message}
                                    />
                                    <FormField
                                        type='number'
                                        name='maxCliqueSize'
                                        labelText='Maximum Clique Size'
                                        className='form-input input input-ghost-primary input-block focus:ring-0'
                                        {...register('maxCliqueSize')}
                                        error={errors.maxCliqueSize?.message}
                                    />
                                    <FormField
                                        type='checkbox'
                                        name='allowDynamicEntryClassCreation'
                                        labelText='Allow Dynamic Entry Class Creation'
                                        className='switch switch-ghost-primary'
                                        row={true}
                                        {...register('allowDynamicEntryClassCreation')}
                                        error={
                                            errors.allowDynamicEntryClassCreation
                                                ?.message
                                        }
                                    />
                                    <div className='flex gap-2 pt-4'>
                                        <button
                                            type='submit'
                                            className='btn btn-primary btn-block'
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </div>
                            </Tab>
                            <Tab title='Actions'>
                                <div className='flex flex-col gap-2 pt-4'>
                                    <button
                                        type='button'
                                        className='btn btn-outline'
                                        onClick={handleReLinkNotes}
                                    >
                                        Re-Link all Notes
                                    </button>
                                </div>
                            </Tab>
                        </Tabs>
                        <AlertBox alert={alert} />
                    </form>
                </div>
            </div>
        </div>
    );
}
