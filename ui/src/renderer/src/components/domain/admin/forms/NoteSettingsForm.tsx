import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import useApi from '@/hooks/api/useApi';
import AlertBox from '../../../base/Alert/AlertBox';
import FormField from '../../../forms/FormField';
import SnippetList from '../../../base/SnippetList/SnippetList';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface FormData {
    minEntries: number;
    minEntities: number;
    maxCliqueSize: number;
    allowDynamicEntryClassCreation: boolean;
}

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
    } = useForm<FormData>({
        resolver: yupResolver(noteSettingsSchema),
        defaultValues: {
            minEntries: 1,
            minEntities: 1,
            maxCliqueSize: 1,
            allowDynamicEntryClassCreation: false,
        },
    });

    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });
    const { managementApi } = useApi();

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await managementApi.managementSettingsRetrieve();
                if (settings && settings.notes) {
                    reset({
                        minEntries: settings.notes.min_entries || 1,
                        minEntities: settings.notes.min_entities || 1,
                        maxCliqueSize: settings.notes.max_clique_size || 1,
                        allowDynamicEntryClassCreation:
                            settings.notes.allow_dynamic_entry_class_creation ??
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
    }, [reset, managementApi]);

    const onSubmit = async (data: FormData) => {
        try {
            await managementApi.managementSettingsCreate({
                requestBody: {
                    notes: {
                        min_entries: data.minEntries,
                        min_entities: data.minEntities,
                        max_clique_size: data.maxCliqueSize,
                        allow_dynamic_entry_class_creation:
                            data.allowDynamicEntryClassCreation,
                    },
                },
            });
            setAlert({
                show: true,
                message: 'Settings updated successfully!',
                color: 'green',
            });
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
            await managementApi.managementActionsCreate({ actionName: 'relinkNotes' });
            setAlert({
                show: true,
                message: 'Re-Link all Notes action triggered!',
                color: 'green',
            });
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
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 mb-3'>
                        <Tabs
                            tabClasses='tabs gap-1 !bg-opacity-0'
                            perTabClass='tab-pill'
                        >
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
                            <Tab title='Snippets'>
                                <div className='flex flex-col gap-3 pt-2'>
                                    <SnippetList userId='null' />
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
                    </form>
                    <AlertBox alert={alert} />
                </div>
            </div>
        </div>
    );
}
