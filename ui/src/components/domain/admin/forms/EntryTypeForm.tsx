import { Button } from '@/components/ui/button';
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
} from '@/components/ui/color-picker';
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
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
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
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { GoldenRatioColorGenerator } from '@/utils/colors/colorUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    EntryClass,
    EntryClassRequest,
    EntryClassRequestTypeEnum,
} from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import OfflineIndicator from '../../../feedback/OfflineIndicator';
import { SelectOption } from '../../../forms';

interface EntryTypeFormProps {
    id?: string | null;
    onAdd?: (result: EntryClass) => void;
}

interface ChildOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface TypeOption extends SelectOption<string> {
    value: EntryClassRequestTypeEnum;
    label: string;
}

interface FormatOption extends SelectOption<string> {
    value: string;
    label: string;
}

const typeOptions: TypeOption[] = [
    { value: EntryClassRequestTypeEnum.Artifact, label: 'Artifact' },
    { value: EntryClassRequestTypeEnum.Entity, label: 'Entity' },
];

const formatOptions: FormatOption[] = [
    { value: 'any', label: 'Any Format' },
    { value: 'options', label: 'Enumerator' },
    { value: 'regex', label: 'Regex' },
];

const entryTypeSchema = z.object({
    type: z
        .object({
            value: z.enum([
                EntryClassRequestTypeEnum.Artifact,
                EntryClassRequestTypeEnum.Entity,
            ]),
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

export default function EntryTypeForm({ id = null, onAdd }: EntryTypeFormProps) {
    const { entriesApi } = useApi();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [entryTypes, setEntryTypes] = useState<ChildOption[]>([]);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<EntryTypeFormValues>({
        resolver: zodResolver(entryTypeSchema) as any,
        defaultValues: {
            type: typeOptions[0],
            subtype: '',
            description: '',
            prefix: '',
            typeFormat: null,
            regex: '',
            options: '',
            generativeRegex: '',
            color: colorGenerator.nextHexColor(),
            children: [],
        },
    });

    // Fetch entry type details in edit mode
    const {
        data: entryTypeData,
        isPending,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.entryTypes.detail(id!),
        queryFn: () => entriesApi.entryClassesRetrieve({ classSubtype: id! }),
        enabled: !!id,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch entry type',
        },
    });

    const { data: entryClassesListData, isPending: isEntryTypesListPending } = useQuery(
        {
            queryKey: queryKeys.entryTypes.lists(),
            queryFn: () => entriesApi.entryClassesList(),
            refetchOnWindowFocus: false,
            meta: { showErrorToast: false, suppressNotification: true },
        },
    );

    useEffect(() => {
        if (entryClassesListData == null) return;
        const results = entryClassesListData.results ?? [];
        setEntryTypes(
            results.map((entry) => ({
                value: entry.subtype,
                label: entry.subtype,
            })),
        );
    }, [entryClassesListData]);

    useEffect(() => {
        if (!entryTypeData) return;
        reset({
            type:
                typeOptions.find((o) => o.value === entryTypeData.type) ||
                typeOptions[0],
            subtype: entryTypeData.subtype,
            description: entryTypeData.description || '',
            prefix: entryTypeData.prefix || '',
            color: entryTypeData.color || colorGenerator.nextHexColor(),
            generativeRegex: entryTypeData.generativeRegex || '',
            typeFormat:
                formatOptions.find((o) => o.value === entryTypeData.format) ||
                formatOptions[0],
            regex: entryTypeData.regex || '',
            options: entryTypeData.options || '',
            children:
                entryTypeData.childrenDetail?.map((x: any) => ({
                    value: x.subtype,
                    label: x.subtype,
                })) || [],
        });
    }, [id, entryTypeData, colorGenerator, reset]);

    const isLoading = isEntryTypesListPending || (!!id && isPending);

    const updateEntryTypeMutation = useMutation({
        mutationFn: async (payload: EntryClassRequest) => {
            return await entriesApi.entryClassesUpdate({
                classSubtype: id!,
                entryClassRequest: payload,
            });
        },
        meta: {
            successMessage: 'Entry type updated successfully!',
            errorMessage: 'Failed to update entry type',
        },
        onSuccess: (result) => {
            if (onAdd) onAdd(result);
        },
        onError: () => {
            toast.error('Failed to update entry type');
        },
    });

    const onSubmit = async (data: EntryTypeFormValues) => {
        const payload: EntryClassRequest = {
            generativeRegex: data.generativeRegex,
            format:
                data.typeFormat?.value === 'any'
                    ? null
                    : (data.typeFormat?.value ?? null),
            type: data.type?.value || EntryClassRequestTypeEnum.Artifact,
            subtype: data.subtype,
            description: data.description,
            prefix: data.prefix,
            color: data.color,
            regex: data.regex,
            options: data.options,
            children: data.children?.map((child) => child.value) ?? [],
        };
        updateEntryTypeMutation.mutate(payload);
    };

    if (isPending && !isPaused) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (isPaused) {
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
    const isArtifact = watchType?.value === EntryClassRequestTypeEnum.Artifact;
    const isEntity = watchType?.value === EntryClassRequestTypeEnum.Entity;
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

    return (
        <form onSubmit={handleFormSubmit(onSubmit)}>
            <div className='flex flex-col gap-6'>
                {/* Basic Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Basic Information</h3>
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
                                                    : null,
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
                                                        onClick={generateRandomColor}
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
                <Separator
                    data-orientation='horizontal'
                    role='none'
                    className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                    data-slot='separator'
                />
                {/* Advanced Section */}
                <div className='flex flex-col gap-4'>
                    <h3 className='font-semibold text-base'>Advanced Settings</h3>
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
                                                    Prefix used when generating entity
                                                    names
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
                                                    aria-invalid={fieldState.invalid}
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
                                <Separator
                                    data-orientation='horizontal'
                                    role='none'
                                    className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                                    data-slot='separator'
                                />
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
                                                    const option = formatOptions.find(
                                                        (opt) => opt.value === value,
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
                                                    aria-invalid={fieldState.invalid}
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
                                <Separator
                                    data-orientation='horizontal'
                                    role='none'
                                    className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                                    data-slot='separator'
                                />

                                {isOptions && (
                                    <>
                                        <Controller
                                            name='options'
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <Field
                                                    orientation='vertical'
                                                    data-invalid={fieldState.invalid}
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
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </Field>
                                            )}
                                        />
                                        <Separator
                                            data-orientation='horizontal'
                                            role='none'
                                            className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                                            data-slot='separator'
                                        />
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
                                                    data-invalid={fieldState.invalid}
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
                                                            {fieldState.error?.message}
                                                        </FieldError>
                                                    )}
                                                </Field>
                                            )}
                                        />
                                        <Separator
                                            data-orientation='horizontal'
                                            role='none'
                                            className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                                            data-slot='separator'
                                        />
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
                                                    data-invalid={fieldState.invalid}
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
                                        <Separator
                                            data-orientation='horizontal'
                                            role='none'
                                            className='shrink-0 touch-manipulation bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px'
                                            data-slot='separator'
                                        />
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
            {/* Save Button */}
            <div className='pt-2 flex justify-end'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
