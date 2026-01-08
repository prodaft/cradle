import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { yupResolver } from '@hookform/resolvers/yup';
import { Plus, Refresh } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import SnippetList, { SnippetListRef } from '../../../base/SnippetList/SnippetList';
import { SettingsButton, SettingsCard, SettingsField } from '../../../forms';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, WarningCircle, InfoCircle } from 'iconoir-react';
import { Separator } from '@/components/ui/separator';

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
    allowDynamicEntryClassCreation: Yup.boolean().default(false),
});

export default function NoteSettingsForm() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();
    const [isLoading, setIsLoading] = useState(true);
    const snippetListRef = useRef<SnippetListRef>(null);
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
    } = useForm<FormData>({
        resolver: yupResolver(noteSettingsSchema),
        defaultValues: {
            minEntries: 1,
            minEntities: 1,
            maxCliqueSize: 1,
            allowDynamicEntryClassCreation: false,
        },
    });

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
                            settings.notes.allow_dynamic_entry_class_creation ?? false,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [managementApi, reset]);

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
            toast.success('Settings updated successfully!');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    const handleReLinkNotes = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'relinkNotes',
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Re-Link all Notes action triggered!',
            });
        } catch {
            setActionAlert({ type: 'error', message: 'Failed to re-link notes' });
        }
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
                    <h2 className='text-2xl font-bold tracking-tight'>Note Settings</h2>
                    <p className='text-muted-foreground'>Configure note creation and linking behavior</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit)}>
                        {/* General Section */}
                        <section id='general' className='pb-8'>
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                General
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Basic note configuration and validation rules
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsField
                                        label='Minimum Entries'
                                        description='Minimum number of entries required in a note'
                                        type='number'
                                        {...register('minEntries')}
                                        error={errors.minEntries}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Minimum Entities'
                                        description='Minimum number of entities required in a note'
                                        type='number'
                                        {...register('minEntities')}
                                        error={errors.minEntities}
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Maximum Clique Size'
                                        description='Maximum size for clique detection'
                                        type='number'
                                        {...register('maxCliqueSize')}
                                        error={errors.maxCliqueSize}
                                    />

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='allowDynamicEntryClassCreation' className='text-sm text-muted-foreground block mb-0.5'>
                                                    Dynamic Entry Class Creation
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>Allow automatic creation of new entry classes</p>
                                                {errors.allowDynamicEntryClassCreation && (
                                                    <p className='text-sm text-destructive mt-1'>{errors.allowDynamicEntryClassCreation.message}</p>
                                                )}
                                            </div>
                                            <Controller
                                                name='allowDynamicEntryClassCreation'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='allowDynamicEntryClassCreation'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Snippets Section */}
                        <section
                            id='snippets'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                Global Snippets
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Reusable text blocks available to all users
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsButton
                                        label='Global Snippets'
                                        description='Reusable text blocks available to all users'
                                        buttonText='New Snippet'
                                        icon={<Plus className='w-3.5 h-3.5' />}
                                        onClick={() => {
                                            snippetListRef.current?.handleAddSnippet();
                                        }}
                                    />
                                    <SnippetList
                                        ref={snippetListRef}
                                        userId='null'
                                        showTitle={false}
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
                                Maintenance operations for notes
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
                                        label='Re-Link All Notes'
                                        description='Regenerate all note links based on current entries'
                                        buttonText='Re-Link'
                                        icon={<Refresh className='w-3.5 h-3.5' />}
                                        onClick={handleReLinkNotes}
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
