import { SettingsHeaderActionsPortal } from '@/components/base/settings-header-actions/settings-header-actions';
import SnippetList, {
    SnippetListRef,
} from '@/components/base/snippet-list/snippet-list';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { queryKeys } from '@/hooks/query';
import { getSuccessMessage } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowClockwiseIcon,
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
    PlusIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { useEffect, useId, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const noteSettingsSchema = z.object({
    minEntries: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    minEntities: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    maxCliqueSize: z.coerce.number().min(1, { error: 'Must be at least 1' }),
    allowDynamicEntryClassCreation: z.boolean().default(false),
});

type NoteSettingsFormData = z.infer<typeof noteSettingsSchema>;

const NOTE_SETTINGS_DEFAULTS: NoteSettingsFormData = {
    minEntries: 1,
    minEntities: 1,
    maxCliqueSize: 1,
    allowDynamicEntryClassCreation: false,
};

interface NoteSettingsApi {
    notes?: {
        min_entries?: number;
        min_entities?: number;
        max_clique_size?: number;
        allow_dynamic_entry_class_creation?: boolean;
    };
}

function getNoteSettingsFromApi(
    settings: NoteSettingsApi | null | undefined,
): NoteSettingsFormData | null {
    if (!settings?.notes) return null;
    const n = settings.notes;
    return {
        minEntries: Math.max(1, n.min_entries ?? 1),
        minEntities: Math.max(1, n.min_entities ?? 1),
        maxCliqueSize: Math.max(1, n.max_clique_size ?? 1),
        allowDynamicEntryClassCreation: n.allow_dynamic_entry_class_creation ?? false,
    };
}

export default function NoteSettingsForm() {
    const formId = useId();
    const snippetListRef = useRef<SnippetListRef>(null);

    const loadedValuesRef = useRef<NoteSettingsFormData | null>(null);

    const {
        handleSubmit,
        reset,
        watch,
        control,
        formState: { isDirty },
    } = useForm<NoteSettingsFormData>({
        resolver: zodResolver(noteSettingsSchema) as any,
        defaultValues: NOTE_SETTINGS_DEFAULTS,
    });

    const { data: settings, isPending } = useQuery({
        queryKey: queryKeys.management.settings(),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/management/settings/',
            );
            if (error) throw { response, error };
            return data;
        },
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const saveSettings = useMutation({
        mutationFn: async (values: NoteSettingsFormData) => {
            const { error, response } = await fetchClient.PATCH(
                '/management/settings/',
                {
                    body: {
                        notes: {
                            min_entries: values.minEntries,
                            min_entities: values.minEntities,
                            max_clique_size: values.maxCliqueSize,
                            allow_dynamic_entry_class_creation:
                                values.allowDynamicEntryClassCreation,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.management.settings() }],
            successMessage: 'Settings updated successfully!',
        },
        onSuccess: (_, variables) => {
            reset(variables);
        },
    });

    const relinkNotes = useMutation({
        mutationFn: async () => {
            const { data, error, response } = await fetchClient.POST('/notes/relink/', {
                body: undefined,
            });
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
        onSuccess: (response) => {
            toast.success(
                getSuccessMessage(response) || 'Action completed successfully!',
            );
        },
    });

    useEffect(() => {
        const values = getNoteSettingsFromApi(settings);
        if (!values) return;
        loadedValuesRef.current = values;
        reset(values);
    }, [settings, reset]);

    const onSubmit = (values: NoteSettingsFormData) => saveSettings.mutateAsync(values);

    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    const revert = () => {
        if (loadedValuesRef.current) reset(loadedValuesRef.current);
    };
    const resetToDefaults = () =>
        reset(NOTE_SETTINGS_DEFAULTS, { keepDefaultValues: true });
    const isAtDefault = isEqual(watch(), NOTE_SETTINGS_DEFAULTS);

    return (
        <>
            <SettingsHeaderActionsPortal>
                <div className='flex items-center gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={!isDirty}
                        onClick={revert}
                        title='Revert'
                    >
                        <ArrowCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={isAtDefault}
                        onClick={resetToDefaults}
                        title='Default'
                    >
                        <ClockCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='submit'
                        form={formId}
                        variant='default'
                        size='icon'
                        disabled={saveSettings.isPending || !isDirty}
                        title='Save Settings'
                    >
                        {saveSettings.isPending ? (
                            <Spinner className='size-4' />
                        ) : (
                            <FloppyDiskIcon className='size-4' weight='bold' />
                        )}
                    </Button>
                </div>
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className='flex flex-col gap-6'>
                    {/* General Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>General</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='minEntries'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='minEntries'
                                                className='text-sm block mb-0.5'
                                            >
                                                Minimum Entries
                                            </FieldLabel>
                                            <FieldDescription>
                                                Minimum number of entries required in a
                                                note
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='minEntries-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='minEntries'
                                                type='number'
                                                aria-invalid={fieldState.invalid}
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
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='minEntities'
                                                className='text-sm block mb-0.5'
                                            >
                                                Minimum Entities
                                            </FieldLabel>
                                            <FieldDescription>
                                                Minimum number of entities required in a
                                                note
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='minEntities-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='minEntities'
                                                type='number'
                                                aria-invalid={fieldState.invalid}
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
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='maxCliqueSize'
                                                className='text-sm block mb-0.5'
                                            >
                                                Maximum Clique Size
                                            </FieldLabel>
                                            <FieldDescription>
                                                Maximum size for clique detection
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='maxCliqueSize-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='maxCliqueSize'
                                                type='number'
                                                aria-invalid={fieldState.invalid}
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
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='allowDynamicEntryClassCreation'
                                                className='text-sm block mb-0.5'
                                            >
                                                Dynamic Entry Class Creation
                                            </FieldLabel>
                                            <FieldDescription>
                                                Allow automatic creation of new entry
                                                classes
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='allowDynamicEntryClassCreation-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Switch
                                            id='allowDynamicEntryClassCreation'
                                            name={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='self-start md:self-center'
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
                        </FieldGroup>
                    </div>
                    {/* Snippets Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Global Snippets</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Field orientation='responsive'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel className='text-sm block mb-0.5'>
                                        Global Snippets
                                    </FieldLabel>
                                    <FieldDescription>
                                        Reusable text blocks available to all users
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-start md:self-center'
                                    onClick={() => {
                                        snippetListRef.current?.handleAddSnippet();
                                    }}
                                >
                                    <PlusIcon className='w-3.5 h-3.5' weight='bold' />
                                    New Snippet
                                </Button>
                            </Field>
                        </FieldGroup>
                        <SnippetList
                            ref={snippetListRef}
                            userId={null}
                            showTitle={false}
                        />
                    </div>
                    {/* Actions Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>Actions</h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Field orientation='responsive'>
                                <FieldContent className='flex-1'>
                                    <FieldLabel className='text-sm block mb-0.5'>
                                        Re-Link All Notes
                                    </FieldLabel>
                                    <FieldDescription>
                                        Regenerate all note links based on current
                                        entries
                                    </FieldDescription>
                                </FieldContent>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='self-start md:self-center'
                                    disabled={relinkNotes.isPending}
                                    onClick={() => relinkNotes.mutate()}
                                >
                                    <ArrowClockwiseIcon
                                        className='w-3.5 h-3.5'
                                        weight='bold'
                                    />
                                    Re-Link
                                </Button>
                            </Field>
                        </FieldGroup>
                    </div>
                </div>
            </form>
        </>
    );
}
