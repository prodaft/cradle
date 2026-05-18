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
import { SettingsHeaderActionsPortal } from '@/components/domain/settings-header-actions';
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
import { queryKeys, useNdjsonQuery } from '@/hooks/query';
import { SelectOption } from '@/types';
import { GoldenRatioColorGenerator } from '@/utils/colors/color-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import OfflineIndicator from '../../../feedback/offline-indicator';

type EntryClass = components['schemas']['EntryClass'];
type EntryClassRequest = components['schemas']['EntryClassRequest'];

interface EntryTypeFormProps {
    id?: string | null;
    onAdd?: (result: EntryClass) => void;
}

interface ChildOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface TypeOption extends SelectOption<string> {
    value: EntryClassRequest['type'];
    label: string;
}

interface FormatOption extends SelectOption<string> {
    value: string;
    label: string;
}

const typeOptions: TypeOption[] = [
    { value: 'artifact', label: 'Artifact' },
    { value: 'entity', label: 'Entity' },
];

const formatOptions: FormatOption[] = [
    { value: 'any', label: 'Any Format' },
    { value: 'options', label: 'Enumerator' },
    { value: 'regex', label: 'Regex' },
];

const entryTypeSchema = z.object({
    type: z
        .object({
            value: z.enum(['artifact', 'entity'] as const),
            label: z.string().min(1),
        })
        .nullable()
        .refine((val) => val !== null, {
            message: 'Class Type is required',
        }),
    subtype: z.string().min(1, { message: 'Subtype is required' }),
    description: z.string().default(''),
    prefix: z.string().default(''),
    typeFormat: z
        .object({ value: z.string().min(1), label: z.string().min(1) })
        .nullable()
        .default(null),
    regex: z.string().default(''),
    options: z.string().default(''),
    generativeRegex: z.string().default(''),
    color: z.string().min(1, { message: 'Color is required' }),
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
        options: data.options || '',
        children:
            data.children_detail?.map((x) => {
                const c = x as { subtype: string };
                return { value: c.subtype, label: c.subtype };
            }) || [],
    };
}

export default function EntryTypeForm({ id = null, onAdd }: EntryTypeFormProps) {
    const formId = useId();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const defaultColor = useMemo(() => colorGenerator.nextHexColor(), [colorGenerator]);
    const entryTypeDefaults = useMemo(
        () => getEntryTypeDefaults(defaultColor),
        [defaultColor],
    );

    const loadedValuesRef = useRef<EntryTypeFormValues | null>(null);

    const {
        handleSubmit: handleFormSubmit,
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
        data: entryTypeData,
        isLoading: isEntryTypeLoading,
        isPaused: isEntryTypePaused,
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
        data: entryClassesListData,
        isLoading: isEntryTypesListLoading,
        isPaused: isEntryTypesListPaused,
    } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'entry-type-form'],
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    const entryTypes = useMemo<ChildOption[]>(() => {
        const results = entryClassesListData ?? [];
        return results.map((entry) => ({
            value: entry.subtype,
            label: entry.subtype,
        }));
    }, [entryClassesListData]);

    useEffect(() => {
        const values = getEntryTypeFormFromApi(entryTypeData, colorGenerator);
        if (!values) return;
        loadedValuesRef.current = values;
        reset(values);
    }, [id, entryTypeData, colorGenerator, reset]);

    const isLoading = isEntryTypesListLoading || isEntryTypeLoading;
    const isOffline = (Boolean(id) && isEntryTypePaused) || isEntryTypesListPaused;

    const updateEntryTypeMutation = useMutation({
        mutationFn: async (payload: EntryClassRequest) => {
            const { data, error, response } = await fetchClient.POST(
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
            ],
        },
        onSuccess: (result) => {
            if (onAdd) onAdd(result);
        },
    });

    const onSubmit = async (data: EntryTypeFormValues) => {
        const payload: EntryClassRequest = {
            generative_regex: data.generativeRegex,
            format:
                !data.typeFormat || data.typeFormat.value === 'any'
                    ? null
                    : data.typeFormat.value,
            type: data.type?.value ?? 'artifact',
            subtype: data.subtype,
            description: data.description,
            prefix: data.prefix,
            color: data.color,
            regex: data.regex,
            options: data.options,
            children: data.children.map((child) => child.value),
        };
        updateEntryTypeMutation.mutate(payload);
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
    const isOptions = watchTypeFormat?.value === 'options';
    const isRegex = watchTypeFormat?.value === 'regex';

    const generateRandomColor = () => {
        setValue('color', colorGenerator.nextHexColor());
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    const handleRevert = () => {
        if (loadedValuesRef.current) reset(loadedValuesRef.current);
    };
    const handleDefault = () => reset(entryTypeDefaults, { keepDefaultValues: true });
    const isAtDefault = isEqual(watch(), entryTypeDefaults);

    return (
        <>
            <SettingsHeaderActionsPortal>
                <div className='flex items-center gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={!isDirty}
                        onClick={handleRevert}
                        title='Revert'
                    >
                        <ArrowCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={isAtDefault}
                        onClick={handleDefault}
                        title='Default'
                    >
                        <ClockCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='submit'
                        form={formId}
                        variant='default'
                        size='icon'
                        disabled={updateEntryTypeMutation.isPending || !isDirty}
                        title='Save Changes'
                    >
                        {updateEntryTypeMutation.isPending ? (
                            <Spinner className='size-4' />
                        ) : (
                            <FloppyDiskIcon className='size-4' weight='bold' />
                        )}
                    </Button>
                </div>
            </SettingsHeaderActionsPortal>
            <form id={formId} onSubmit={handleFormSubmit(onSubmit)}>
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

                                    {isOptions && (
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

                                    {isRegex && (
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

                                    {!isOptions && (
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
                                                    <p className='text-center text-sm'>
                                                        No entry types found
                                                    </p>
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>
                </div>
            </form>
        </>
    );
}
