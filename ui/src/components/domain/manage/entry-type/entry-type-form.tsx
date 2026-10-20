import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import {
    ColorPicker,
    ColorPickerArea,
    ColorPickerContent,
    ColorPickerEyeDropper,
    ColorPickerFormatSelect,
    ColorPickerHueSlider,
    ColorPickerInput,
    ColorPickerSwatch,
    ColorPickerTrigger,
} from '@/components/custom/color-picker';
import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import {
    entryClassFormat,
    formatOptions,
    typeOptions,
} from '@/components/domain/manage/entry-type/entry-class-options';
import OfflineIndicator from '@/components/feedback/offline-indicator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
} from '@/components/ui/input-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys, useNdjsonQuery } from '@/hooks/query';
import { SelectOption } from '@/types/models';
import { GoldenRatioColorGenerator } from '@/utils/colors/color-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import { entryTypeEnumValues, type components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

type EntryClass = components['schemas']['EntryClass'];
type EntryClassRequest = components['schemas']['EntryClassRequest'];

const INTERNAL_SUBTYPES = new Set(['alias', 'note', 'file', 'digest', 'enrichment']);

interface EntryTypeFormProps {
    id?: string | null;
    onAdd?: (result: EntryClass) => void;
}

interface ChildOption extends SelectOption<string> {
    value: string;
    label: string;
}

const entryTypeSchema = z.object({
    type: z
        .object({
            value: z.enum(entryTypeEnumValues),
            label: z.string().min(1),
        })
        .nullable()
        .refine((val) => val !== null, {
            error: 'Class Type is required',
        }),
    subtype: z.string().min(1, { error: 'Subtype is required' }),
    description: z.string().default(''),
    prefix: z.string().default(''),
    typeFormat: z
        .object({ value: z.string().min(1), label: z.string().min(1) })
        .nullable()
        .default(null),
    regex: z.string().default(''),
    options: z.string().default(''),
    generativeRegex: z.string().default(''),
    color: z.string().min(1, { error: 'Color is required' }),
    children: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
});

type EntryTypeFormValues = z.infer<typeof entryTypeSchema>;

const getEntryTypeDefaults = (color: string): EntryTypeFormValues => ({
    type: typeOptions[0]!,
    subtype: '',
    description: '',
    prefix: '',
    typeFormat: null,
    regex: '',
    options: '',
    generativeRegex: '',
    color,
    children: [],
});

function getEntryTypeFormFromApi(
    data: EntryClass | null | undefined,
    colorGenerator: GoldenRatioColorGenerator,
): EntryTypeFormValues | null {
    if (!data) return null;
    return {
        type: typeOptions.find((o) => o.value === data.type) ?? typeOptions[0]!,
        subtype: data.subtype,
        description: data.description || '',
        prefix: data.prefix || '',
        color: data.color || colorGenerator.nextHexColor(),
        generativeRegex: data.generative_regex || '',
        typeFormat:
            formatOptions.find((o) => o.value === data.format) ?? formatOptions[0]!,
        regex: data.regex || '',
        options: (data.options ?? []).join('\n'),
        children:
            data.children?.map((x) => {
                const c = x as { subtype: string };
                return { value: c.subtype, label: c.subtype };
            }) || [],
    };
}

export default function EntryTypeForm({ id = null, onAdd }: EntryTypeFormProps) {
    const formId = useId();
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const canDelete = isAdmin && !!id && !INTERNAL_SUBTYPES.has(id);
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const defaultColor = useMemo(() => colorGenerator.nextHexColor(), [colorGenerator]);
    const entryTypeDefaults = useMemo(
        () => getEntryTypeDefaults(defaultColor),
        [defaultColor],
    );

    const {
        handleSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { isDirty },
    } = useForm<EntryTypeFormValues>({
        resolver: zodResolver(entryTypeSchema) as any,
        defaultValues: entryTypeDefaults,
    });

    const {
        data: entryClass,
        isLoading: isEntryClassLoading,
        isPaused: isEntryClassPaused,
    } = $api.useQuery(
        'get',
        '/entries/entry-classes/{class_subtype}/',
        { params: { path: { class_subtype: id! } } },
        {
            enabled: !!id,
            meta: { showErrorToast: true },
        },
    );

    const {
        data: entryClasses,
        isLoading: isClassesLoading,
        isPaused: isClassesPaused,
    } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'entry-type-form'],
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const entryTypes = useMemo<ChildOption[]>(() => {
        const results = entryClasses ?? [];
        return results.map((entry) => ({
            value: entry.subtype,
            label: entry.subtype,
        }));
    }, [entryClasses]);

    useEffect(() => {
        const values = getEntryTypeFormFromApi(entryClass, colorGenerator);
        if (!values) return;
        reset(values);
    }, [id, entryClass, colorGenerator, reset]);

    const isPageLoading = isClassesLoading || isEntryClassLoading;
    const isOffline = (Boolean(id) && isEntryClassPaused) || isClassesPaused;

    const saveEntryClass = useMutation({
        mutationFn: async (payload: EntryClassRequest) => {
            const { data, error, response } = await fetchClient.PUT(
                '/entries/entry-classes/{class_subtype}/',
                {
                    params: { path: { class_subtype: id! } },
                    body: payload,
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            successMessage: 'Entry type updated successfully!',
            invalidateQueries: [
                { queryKey: queryKeys.entryTypes.apiList() },
                { queryKey: ['entry_classes'] },
                ...(id ? [{ queryKey: queryKeys.entryTypes.apiDetail(id) }] : []),
                ...queryKeys.entryLists().map((queryKey) => ({ queryKey })),
            ],
        },
        onSuccess: (result) => {
            if (onAdd) onAdd(result);
        },
    });

    const deleteEntryClass = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE(
                '/entries/entry-classes/{class_subtype}/',
                { params: { path: { class_subtype: id! } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Entry type deleted successfully',
            invalidateQueries: [
                { queryKey: queryKeys.entryTypes.apiList() },
                { queryKey: ['entry_classes'] },
                ...queryKeys.entryLists().map((queryKey) => ({ queryKey })),
            ],
        },
        onSuccess: () => router.navigate({ to: '/manage/entry-types' as any }),
    });

    const onSubmit = async (data: EntryTypeFormValues) => {
        const payload: EntryClassRequest = {
            generative_regex: data.generativeRegex,
            format: entryClassFormat(data.typeFormat?.value),
            type: data.type?.value ?? 'artifact',
            subtype: data.subtype,
            description: data.description,
            prefix: data.prefix,
            color: data.color,
            regex: data.regex,
            options: data.options.split('\n'),
            child_subtypes: data.children.map((child) => child.value),
        };
        saveEntryClass.mutate(payload);
    };

    if (isOffline) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='w-full max-w-md p-4'>
                    <OfflineIndicator />
                </div>
            </div>
        );
    }

    const watchType = watch('type');
    const watchTypeFormat = watch('typeFormat');
    const isArtifact = watchType?.value === 'artifact';
    const isEntity = watchType?.value === 'entity';
    const isOptionsFormat = watchTypeFormat?.value === 'options';
    const isRegexFormat = watchTypeFormat?.value === 'regex';

    const generateRandomColor = () => {
        setValue('color', colorGenerator.nextHexColor());
    };

    if (isPageLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={isDirty}
                    saving={saveEntryClass.isPending}
                    form={formId}
                />
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className='flex flex-col gap-6'>
                    {/* Basic Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>
                                Basic Information
                            </h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='type'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                Class Type
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription>
                                                Artifact or Entity classification
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Select
                                            items={typeOptions}
                                            value={field.value?.value || ''}
                                            onValueChange={(value) => {
                                                const option = typeOptions.find(
                                                    (opt) => opt.value === value,
                                                );
                                                field.onChange(
                                                    option
                                                        ? {
                                                              value: option.value,
                                                              label: option.label,
                                                          }
                                                        : typeOptions[0],
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className='self-start md:self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'type-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder='Select type' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {typeOptions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='subtype'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='subtype'
                                                className='text-sm block mb-0.5'
                                            >
                                                Name
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription>
                                                Unique identifier for this entry class
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='shrink-0 self-start md:self-center'>
                                            <Input
                                                {...field}
                                                id='subtype'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'subtype-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />
                            <Separator />
                            <Controller
                                name='description'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='vertical'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor='description'
                                                className='text-sm block mb-0.5'
                                            >
                                                Description
                                            </FieldLabel>
                                            <FieldDescription className='text-sm mb-2'>
                                                Brief explanation of this entry type
                                            </FieldDescription>
                                        </FieldContent>
                                        <Textarea
                                            {...field}
                                            id='description'
                                            placeholder='Description'
                                            rows={3}
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={
                                                fieldState.invalid
                                                    ? 'description-error'
                                                    : undefined
                                            }
                                        />
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='color'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                Color
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription>
                                                Display color for this entry type
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-72 shrink-0 self-start md:self-center'>
                                            <ColorPicker
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <InputGroup>
                                                    <ColorPickerInput
                                                        withoutAlpha
                                                        className='flex-1 border-0 shadow-none focus-visible:ring-0'
                                                    />
                                                    <InputGroupAddon align='inline-end'>
                                                        <ColorPickerTrigger asChild>
                                                            <InputGroupButton size='icon-xs'>
                                                                <ColorPickerSwatch className='size-4 rounded-sm' />
                                                            </InputGroupButton>
                                                        </ColorPickerTrigger>
                                                        <InputGroupButton
                                                            size='icon-xs'
                                                            onClick={
                                                                generateRandomColor
                                                            }
                                                        >
                                                            <svg
                                                                xmlns='http://www.w3.org/2000/svg'
                                                                fill='none'
                                                                viewBox='0 0 24 24'
                                                                stroke='currentColor'
                                                            >
                                                                <path
                                                                    strokeLinecap='round'
                                                                    strokeLinejoin='round'
                                                                    strokeWidth={2}
                                                                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                                                />
                                                            </svg>
                                                        </InputGroupButton>
                                                    </InputGroupAddon>
                                                </InputGroup>
                                                <ColorPickerContent>
                                                    <ColorPickerArea />
                                                    <div className='flex items-center justify-between gap-2'>
                                                        <ColorPickerEyeDropper />
                                                        <ColorPickerFormatSelect />
                                                    </div>
                                                    <ColorPickerHueSlider />
                                                </ColorPickerContent>
                                            </ColorPicker>
                                        </div>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>
                    {/* Advanced Section */}
                    <div className='flex flex-col gap-4'>
                        <div className='space-y-4'>
                            <h3 className='font-semibold text-base'>
                                Advanced Settings
                            </h3>
                            <Separator className='mt-4' />
                        </div>
                        <FieldGroup className='gap-4'>
                            {isEntity && (
                                <>
                                    <Controller
                                        name='prefix'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='responsive'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel
                                                        htmlFor='prefix'
                                                        className='text-sm block mb-0.5'
                                                    >
                                                        Prefix
                                                    </FieldLabel>
                                                    <FieldDescription>
                                                        Prefix used when generating
                                                        entity names
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <div className='shrink-0 self-start md:self-center'>
                                                    <Input
                                                        {...field}
                                                        id='prefix'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'prefix-error'
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </Field>
                                        )}
                                    />
                                    <Separator />
                                </>
                            )}

                            {isArtifact && (
                                <>
                                    <Controller
                                        name='typeFormat'
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                orientation='responsive'
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldContent className='flex-1'>
                                                    <FieldLabel className='text-sm block mb-0.5'>
                                                        Format
                                                    </FieldLabel>
                                                    <FieldDescription>
                                                        Validation format for artifact
                                                        values
                                                    </FieldDescription>
                                                    {fieldState.invalid && (
                                                        <FieldError className='text-sm mt-1'>
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </FieldContent>
                                                <Select
                                                    items={formatOptions}
                                                    value={field.value?.value || ''}
                                                    onValueChange={(value) => {
                                                        const option =
                                                            formatOptions.find(
                                                                (opt) =>
                                                                    opt.value === value,
                                                            );
                                                        field.onChange(
                                                            option
                                                                ? {
                                                                      value: option.value,
                                                                      label: option.label,
                                                                  }
                                                                : null,
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        className='self-start md:self-center'
                                                        aria-invalid={
                                                            fieldState.invalid
                                                        }
                                                        aria-describedby={
                                                            fieldState.invalid
                                                                ? 'typeFormat-error'
                                                                : undefined
                                                        }
                                                    >
                                                        <SelectValue placeholder='Select format' />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {formatOptions.map((option) => (
                                                            <SelectItem
                                                                key={option.value}
                                                                value={option.value}
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        )}
                                    />
                                    <Separator />

                                    {isOptionsFormat && (
                                        <>
                                            <Controller
                                                name='options'
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <Field
                                                        orientation='vertical'
                                                        data-invalid={
                                                            fieldState.invalid
                                                        }
                                                    >
                                                        <FieldContent>
                                                            <FieldLabel
                                                                htmlFor='options'
                                                                className='text-sm block mb-0.5'
                                                            >
                                                                Options
                                                            </FieldLabel>
                                                            <FieldDescription className='text-sm mb-2'>
                                                                Allowed values (one per
                                                                line)
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Textarea
                                                            {...field}
                                                            id='options'
                                                            placeholder='Enter possible values separated by newlines.'
                                                            rows={6}
                                                            aria-invalid={
                                                                fieldState.invalid
                                                            }
                                                            aria-describedby={
                                                                fieldState.invalid
                                                                    ? 'options-error'
                                                                    : undefined
                                                            }
                                                        />
                                                        {fieldState.invalid && (
                                                            <FieldError className='text-sm mt-1'>
                                                                {
                                                                    fieldState.error
                                                                        ?.message
                                                                }
                                                            </FieldError>
                                                        )}
                                                    </Field>
                                                )}
                                            />
                                            <Separator />
                                        </>
                                    )}

                                    {isRegexFormat && (
                                        <>
                                            <Controller
                                                name='regex'
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <Field
                                                        orientation='vertical'
                                                        data-invalid={
                                                            fieldState.invalid
                                                        }
                                                    >
                                                        <FieldContent>
                                                            <FieldLabel
                                                                htmlFor='regex'
                                                                className='text-sm block mb-0.5'
                                                            >
                                                                Regex
                                                            </FieldLabel>
                                                            <FieldDescription className='text-sm mb-2'>
                                                                Regular expression for
                                                                validation
                                                            </FieldDescription>
                                                        </FieldContent>
                                                        <Textarea
                                                            {...field}
                                                            id='regex'
                                                            placeholder='Enter the regex for the type.'
                                                            rows={3}
                                                            aria-invalid={
                                                                fieldState.invalid
                                                            }
                                                            aria-describedby={
                                                                fieldState.invalid
                                                                    ? 'regex-error'
                                                                    : undefined
                                                            }
                                                        />
                                                        {fieldState.invalid && (
                                                            <FieldError className='text-sm mt-1'>
                                                                {
                                                                    fieldState.error
                                                                        ?.message
                                                                }
                                                            </FieldError>
                                                        )}
                                                    </Field>
                                                )}
                                            />
                                            <Separator />
                                        </>
                                    )}

                                    {!isOptionsFormat && (
                                        <>
                                            <Controller
                                                name='generativeRegex'
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <Field
                                                        orientation='responsive'
                                                        data-invalid={
                                                            fieldState.invalid
                                                        }
                                                    >
                                                        <FieldContent className='flex-1'>
                                                            <FieldLabel
                                                                htmlFor='generativeRegex'
                                                                className='text-sm block mb-0.5'
                                                            >
                                                                Generative Regex
                                                            </FieldLabel>
                                                            <FieldDescription>
                                                                Regex used to generate
                                                                random sample values
                                                            </FieldDescription>
                                                            {fieldState.invalid && (
                                                                <FieldError className='text-sm mt-1'>
                                                                    {
                                                                        fieldState.error
                                                                            ?.message
                                                                    }
                                                                </FieldError>
                                                            )}
                                                        </FieldContent>
                                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                                            <Input
                                                                {...field}
                                                                id='generativeRegex'
                                                                placeholder='e.g. [A-Z]{3}-[0-9]{4}'
                                                                aria-invalid={
                                                                    fieldState.invalid
                                                                }
                                                                aria-describedby={
                                                                    fieldState.invalid
                                                                        ? 'generativeRegex-error'
                                                                        : undefined
                                                                }
                                                            />
                                                        </div>
                                                    </Field>
                                                )}
                                            />
                                            <Separator />
                                        </>
                                    )}
                                </>
                            )}

                            <Controller
                                name='children'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block mb-0.5'>
                                                Children
                                            </FieldLabel>
                                            <FieldDescription>
                                                Entry types that can be children of this
                                                type
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-64 shrink-0 self-start md:self-center'>
                                            <MultipleSelector
                                                value={
                                                    (field.value?.map((c) => ({
                                                        value: c.value,
                                                        label: c.label,
                                                    })) || []) as Option[]
                                                }
                                                defaultOptions={entryTypes as Option[]}
                                                placeholder='Select children...'
                                                onChange={(options) => {
                                                    field.onChange(
                                                        options.map((o) => ({
                                                            value: o.value,
                                                            label: o.label,
                                                        })),
                                                    );
                                                }}
                                                emptyIndicator={
                                                    <p>No entry types found</p>
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />

                            {canDelete && (
                                <>
                                    <Separator />

                                    <Field orientation='responsive'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block'>
                                                Delete
                                            </FieldLabel>
                                            <FieldDescription>
                                                Entries of this type are removed. Notes
                                                are kept but lose their links to them.
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='sm'
                                            className='self-start md:self-center'
                                            onClick={() => setIsDeleteOpen(true)}
                                        >
                                            Delete
                                        </Button>
                                    </Field>
                                </>
                            )}
                        </FieldGroup>
                    </div>
                </div>
            </form>
            {canDelete && (
                <AlertDialog
                    open={isDeleteOpen}
                    onOpenChange={(open) => {
                        setIsDeleteOpen(open);
                        if (!open) setConfirmText('');
                    }}
                >
                    <AlertDialogContent className='sm:max-w-md'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {id}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This removes the entry type and its entries. It cannot
                                be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <FieldGroup className='gap-4'>
                            <Field>
                                <FieldLabel htmlFor='confirm-delete-entry-type'>
                                    Type below to confirm
                                </FieldLabel>
                                <Input
                                    id='confirm-delete-entry-type'
                                    type='text'
                                    placeholder={`Type "${id}" to confirm`}
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <AlertDialogFooter>
                            <AlertDialogCancel variant='outline' size='sm'>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant='destructive'
                                size='sm'
                                disabled={
                                    confirmText !== id || deleteEntryClass.isPending
                                }
                                onClick={() => deleteEntryClass.mutate()}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
