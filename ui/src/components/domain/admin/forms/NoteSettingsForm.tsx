import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PlusIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import SnippetList, { SnippetListRef } from '../../../base/SnippetList/SnippetList';

const noteSettingsSchema = z.object({
    minEntries: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    minEntities: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    maxCliqueSize: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    allowDynamicEntryClassCreation: z.boolean().default(false),
});

type NoteSettingsFormData = z.infer<typeof noteSettingsSchema>;

export default function NoteSettingsForm() {
    const { managementApi } = useApi();
    const [isLoading, setIsLoading] = useState(true);
    const snippetListRef = useRef<SnippetListRef>(null);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm<NoteSettingsFormData>({
        resolver: zodResolver(noteSettingsSchema) as any,
        defaultValues: {
            minEntries: 1,
            minEntities: 1,
            maxCliqueSize: 1,
            allowDynamicEntryClassCreation: false,
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
        mutationFn: async (data: NoteSettingsFormData) => {
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
        },
        meta: {
            successMessage: 'Settings updated successfully!',
            errorMessage: 'Failed to save settings',
        },
        onError: () => {
            toast.error('Failed to save settings');
        },
    });

    const relinkNotesMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: 'relinkNotes',
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            toast.success('Re-Link all Notes action triggered!');
        },
        onError: () => {
            toast.error('Failed to trigger Re-Link action');
        },
    });

    useEffect(() => {
        async function fetchSettings() {
            try {
                const settings = await fetchSettingsMutation.mutateAsync();
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
                // Error already handled
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [reset]);

    const onSubmit = async (data: NoteSettingsFormData) => {
        updateSettingsMutation.mutate(data);
    };

    const handleReLinkNotes = () => {
        relinkNotesMutation.mutate();
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
            <div className='w-full'>
                <form onSubmit={handleFormSubmit(onSubmit)}>
                    {/* General Section */}
                    <section id='general'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            General
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Basic note configuration and validation rules
                        </p>

                        <div className='space-y-4'>
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <Controller
                                        name='minEntries'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='minEntries'
                                                        className='text-sm text-muted-foreground block mb-0.5'
                                                    >
                                                        Minimum Entries
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Minimum number of entries
                                                        required in a note
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto'>
                                                    <Input
                                                        {...field}
                                                        id='minEntries'
                                                        type='number'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'minEntries-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Controller
                                        name='minEntities'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='minEntities'
                                                        className='text-sm text-muted-foreground block mb-0.5'
                                                    >
                                                        Minimum Entities
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Minimum number of entities
                                                        required in a note
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto'>
                                                    <Input
                                                        {...field}
                                                        id='minEntities'
                                                        type='number'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'minEntities-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Controller
                                        name='maxCliqueSize'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='maxCliqueSize'
                                                        className='text-sm text-muted-foreground block mb-0.5'
                                                    >
                                                        Maximum Clique Size
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Maximum size for clique
                                                        detection
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='w-auto'>
                                                    <Input
                                                        {...field}
                                                        id='maxCliqueSize'
                                                        type='number'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'maxCliqueSize-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Separator />

                                    <Controller
                                        name='allowDynamicEntryClassCreation'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='horizontal'
                                                className='py-2'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='allowDynamicEntryClassCreation'
                                                        className='text-sm text-muted-foreground block mb-0.5'
                                                    >
                                                        Dynamic Entry Class Creation
                                                    </FieldLabel>
                                                    <FieldDescription className='text-sm'>
                                                        Allow automatic creation of new
                                                        entry classes
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <Switch
                                                    id='allowDynamicEntryClassCreation'
                                                    name={field.name}
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    aria-invalid={fieldState.invalid}
                                                    aria-describedby={
                                                        fieldState.invalid
                                                            ? 'allowDynamicEntryClassCreation-error'
                                                            : undefined
                                                    }
                                                />
                                            </Field>
                                        )}
                                    />
                                </CardContent>
                            </Card>
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
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                Global Snippets
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Reusable text blocks available to all
                                                users
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => {
                                                snippetListRef.current?.handleAddSnippet();
                                            }}
                                        >
                                            <PlusIcon className='w-3.5 h-3.5' weight="bold" />
                                            New Snippet
                                        </Button>
                                    </Field>
                                    <SnippetList
                                        ref={snippetListRef}
                                        userId='null'
                                        showTitle={false}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* Actions Section */}
                    <section id='actions' className='border-t border-white/5 pt-5 pb-3'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            Actions
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Maintenance operations for notes
                        </p>

                        <div className='space-y-4'>
                            <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    <Field orientation='horizontal' className='py-2'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                Re-Link All Notes
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Regenerate all note links based on
                                                current entries
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={handleReLinkNotes}
                                        >
                                            <ArrowClockwiseIcon className='w-3.5 h-3.5' weight="bold" />
                                            Re-Link
                                        </Button>
                                    </Field>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className='pt-2 flex justify-end'>
                        <Button type='submit' variant='default' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
