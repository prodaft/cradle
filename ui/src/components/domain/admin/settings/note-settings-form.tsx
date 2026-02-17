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
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowClockwiseIcon, PlusIcon } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import SnippetList, { SnippetListRef } from '../../../base/snippet-list/snippet-list';

const noteSettingsSchema = z.object({
    minEntries: z.coerce.number().min(1, { message: 'Must be at least 1' }),
    minEntities: z.coerce.number().min(1, { message: 'Must be at least 1' }),
    maxCliqueSize: z.coerce.number().min(1, { message: 'Must be at least 1' }),
    allowDynamicEntryClassCreation: z.boolean().default(false),
});

type NoteSettingsFormData = z.infer<typeof noteSettingsSchema>;

export default function NoteSettingsForm() {
    const { managementApi } = useApi();
    const snippetListRef = useRef<SnippetListRef>(null);

    const {
        handleSubmit: handleFormSubmit,
        reset,
        control,
        formState: { isDirty },
    } = useForm<NoteSettingsFormData>({
        resolver: zodResolver(noteSettingsSchema) as any,
        defaultValues: {
            minEntries: 1,
            minEntities: 1,
            maxCliqueSize: 1,
            allowDynamicEntryClassCreation: false,
        },
    });

    const { data: settingsData, isLoading } = useQuery({
        queryKey: queryKeys.management.settings(),
        queryFn: () => managementApi.managementSettingsRetrieve(),
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
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
        },
        onSuccess: (_, variables) => {
            reset(variables);
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
    });

    useEffect(() => {
        if (!settingsData?.notes) return;
        reset({
            minEntries: Math.max(1, settingsData.notes.min_entries ?? 1),
            minEntities: Math.max(1, settingsData.notes.min_entities ?? 1),
            maxCliqueSize: Math.max(1, settingsData.notes.max_clique_size ?? 1),
            allowDynamicEntryClassCreation:
                settingsData.notes.allow_dynamic_entry_class_creation ?? false,
        });
    }, [settingsData, reset]);

    const onSubmit = (data: NoteSettingsFormData) =>
        updateSettingsMutation.mutateAsync(data);

    const handleReLinkNotes = () => {
        relinkNotesMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <form onSubmit={handleFormSubmit(onSubmit)}>
            <div className='flex flex-col gap-6'>
                {/* General Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>General</h3>
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
                                            Minimum number of entries required in a note
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
                <Separator
                    data-orientation='horizontal'
                    role='none'
                    className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                    data-slot='separator'
                />
                {/* Snippets Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Global Snippets</h3>
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
                    <SnippetList ref={snippetListRef} userId='null' showTitle={false} />
                </div>
                <Separator
                    data-orientation='horizontal'
                    role='none'
                    className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                    data-slot='separator'
                />
                {/* Actions Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Actions</h3>
                    <FieldGroup className='gap-4'>
                        <Field orientation='responsive'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block mb-0.5'>
                                    Re-Link All Notes
                                </FieldLabel>
                                <FieldDescription>
                                    Regenerate all note links based on current entries
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='self-start md:self-center'
                                disabled={relinkNotesMutation.isPending}
                                onClick={handleReLinkNotes}
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
            {/* Save Button */}
            <div className='pt-2 flex justify-end'>
                <Button
                    type='submit'
                    variant='default'
                    disabled={updateSettingsMutation.isPending || !isDirty}
                >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </form>
    );
}
