import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupTextarea,
} from '@/components/ui/input-group';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { SelectOption } from '../../../forms';

interface AddEntryFormProps {
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

type FormData = z.infer<typeof entryTypeSchema>;

export default function AddEntryForm({ onAdd }: AddEntryFormProps) {
    const { entriesApi } = useApi();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [entryTypes, setEntryTypes] = useState<ChildOption[]>([]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorButtonRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit: handleFormSubmit,
        watch,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
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

    const { data: entryClassesListData } = useQuery({
        queryKey: queryKeys.entryTypes.lists(),
        queryFn: () => entriesApi.entryClassesList(),
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

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

    const watchType = watch('type');
    const watchTypeFormat = watch('typeFormat');
    const watchColor = watch('color');
    const isEntity = watchType?.value === 'entity';
    const isArtifact = watchType?.value === 'artifact';
    const isOptions = watchTypeFormat?.value === 'options';
    const isRegex = watchTypeFormat?.value === 'regex';

    const generateRandomColor = () => {
        setValue('color', colorGenerator.nextHexColor());
    };

    const createEntryMutation = useMutation({
        mutationFn: async (payload: EntryClassRequest) => {
            return await entriesApi.entryClassesCreate({
                entryClassRequest: payload,
            });
        },
        meta: {
            successMessage: 'Entry created successfully!',
            errorMessage: 'Failed to create entry',
        },
        onSuccess: (result) => {
            if (onAdd) onAdd(result);
        },
    });

    const onSubmit = async (data: FormData) => {
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
        createEntryMutation.mutate(payload);
    };

    return (
        <form onSubmit={handleFormSubmit(onSubmit)} className='w-full'>
            <FieldGroup className='gap-4'>
                <Field data-invalid={Boolean(errors.type)}>
                    <FieldLabel htmlFor='type'>
                        Class Type
                        <span className='text-destructive ml-1'>*</span>
                    </FieldLabel>
                    <Controller
                        name='type'
                        control={control}
                        render={({ field, fieldState }) => (
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
                                <SelectTrigger aria-invalid={fieldState.invalid}>
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
                        )}
                    />
                    <FieldDescription>
                        Artifact or Entity classification
                    </FieldDescription>
                    {errors.type && (
                        <FieldError>{errors.type.message?.toString()}</FieldError>
                    )}
                </Field>

                <Field data-invalid={Boolean(errors.subtype)}>
                    <FieldLabel htmlFor='subtype'>
                        Subtype
                        <span className='text-destructive ml-1'>*</span>
                    </FieldLabel>
                    <InputGroup>
                        <InputGroupInput
                            id='subtype'
                            placeholder='Subtype'
                            {...register('subtype')}
                            aria-invalid={Boolean(errors.subtype)}
                            required
                        />
                    </InputGroup>
                    <FieldDescription>
                        Unique identifier for this entry class
                    </FieldDescription>
                    {errors.subtype && (
                        <FieldError>{errors.subtype.message}</FieldError>
                    )}
                </Field>

                <Field data-invalid={Boolean(errors.description)}>
                    <FieldLabel htmlFor='description'>Description</FieldLabel>
                    <InputGroup>
                        <InputGroupTextarea
                            id='description'
                            placeholder='Description'
                            rows={3}
                            {...register('description')}
                            aria-invalid={Boolean(errors.description)}
                        />
                    </InputGroup>
                    <FieldDescription>
                        Brief explanation of this entry type
                    </FieldDescription>
                    {errors.description && (
                        <FieldError>{errors.description.message}</FieldError>
                    )}
                </Field>

                <Field data-invalid={Boolean(errors.color)}>
                    <FieldLabel htmlFor='color'>
                        Color
                        <span className='text-destructive ml-1'>*</span>
                    </FieldLabel>
                    <InputGroup>
                        <Controller
                            name='color'
                            control={control}
                            render={({ field }) => (
                                <InputGroupInput
                                    id='color'
                                    type='text'
                                    className='text-sm rounded-full'
                                    {...field}
                                    aria-invalid={Boolean(errors.color)}
                                    required
                                />
                            )}
                        />
                        <InputGroupAddon align='inline-end'>
                            <div
                                ref={colorButtonRef}
                                className='h-6 w-8 rounded cursor-pointer border border-border flex-shrink-0'
                                style={{ backgroundColor: watchColor }}
                                onClick={() => setShowColorPicker(!showColorPicker)}
                            />
                            <InputGroupButton
                                type='button'
                                variant='outline'
                                onClick={generateRandomColor}
                                aria-label='Generate random color'
                            >
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    className='h-4 w-4'
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
                    {showColorPicker &&
                        colorButtonRef.current &&
                        (() => {
                            const buttonRect =
                                colorButtonRef.current!.getBoundingClientRect();
                            const pickerWidth = 200;
                            const pickerHeight = 200;

                            let leftPos = buttonRect.left;
                            if (leftPos + pickerWidth > window.innerWidth) {
                                leftPos = buttonRect.right - pickerWidth;
                            }
                            leftPos = Math.max(8, leftPos);

                            const bottomPos = window.innerHeight - buttonRect.top + 8;

                            return (
                                <>
                                    <div
                                        className='fixed inset-0 z-10'
                                        onClick={() => setShowColorPicker(false)}
                                    />
                                    <div
                                        className='fixed z-20'
                                        style={{
                                            left: `${leftPos}px`,
                                            bottom: `${bottomPos}px`,
                                        }}
                                    >
                                        <Controller
                                            name='color'
                                            control={control}
                                            render={({ field }) => (
                                                <HexColorPicker
                                                    color={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                </>
                            );
                        })()}
                    <FieldDescription>
                        Display color for this entry type
                    </FieldDescription>
                    {errors.color && <FieldError>{errors.color.message}</FieldError>}
                </Field>
            </FieldGroup>

            {/* Advanced Section */}
            <div className='border-t border-white/5 pt-5 mt-5'>
                <div className='space-y-4'>
                    <FieldGroup className='gap-4'>
                        {isEntity && (
                            <Field data-invalid={Boolean(errors.prefix)}>
                                <FieldLabel htmlFor='prefix'>Prefix</FieldLabel>
                                <InputGroup>
                                    <InputGroupInput
                                        id='prefix'
                                        placeholder='Prefix'
                                        {...register('prefix')}
                                        aria-invalid={Boolean(errors.prefix)}
                                    />
                                </InputGroup>
                                <FieldDescription>
                                    Prefix used when generating entity names
                                </FieldDescription>
                                {errors.prefix && (
                                    <FieldError>{errors.prefix.message}</FieldError>
                                )}
                            </Field>
                        )}

                        {isArtifact && (
                            <>
                                <Field data-invalid={Boolean(errors.typeFormat)}>
                                    <FieldLabel htmlFor='typeFormat'>Format</FieldLabel>
                                    <Controller
                                        name='typeFormat'
                                        control={control}
                                        render={({ field, fieldState }) => (
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
                                                    aria-invalid={fieldState.invalid}
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
                                        )}
                                    />
                                    <FieldDescription>
                                        Validation format for artifact values
                                    </FieldDescription>
                                    {errors.typeFormat && (
                                        <FieldError>
                                            {errors.typeFormat.message?.toString()}
                                        </FieldError>
                                    )}
                                </Field>

                                {isOptions && (
                                    <Field data-invalid={Boolean(errors.options)}>
                                        <FieldLabel htmlFor='options'>
                                            Options
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupTextarea
                                                id='options'
                                                placeholder='Enter possible values separated by newlines.'
                                                rows={6}
                                                {...register('options')}
                                                aria-invalid={Boolean(errors.options)}
                                            />
                                        </InputGroup>
                                        <FieldDescription>
                                            Allowed values (one per line)
                                        </FieldDescription>
                                        {errors.options && (
                                            <FieldError>
                                                {errors.options.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}

                                {isRegex && (
                                    <Field data-invalid={Boolean(errors.regex)}>
                                        <FieldLabel htmlFor='regex'>Regex</FieldLabel>
                                        <InputGroup>
                                            <InputGroupTextarea
                                                id='regex'
                                                placeholder='Enter the regex for the type.'
                                                rows={3}
                                                {...register('regex')}
                                                aria-invalid={Boolean(errors.regex)}
                                            />
                                        </InputGroup>
                                        <FieldDescription>
                                            Regular expression for validation
                                        </FieldDescription>
                                        {errors.regex && (
                                            <FieldError>
                                                {errors.regex.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}

                                {!isOptions && (
                                    <Field
                                        data-invalid={Boolean(errors.generativeRegex)}
                                    >
                                        <FieldLabel htmlFor='generativeRegex'>
                                            Generative Regex
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupTextarea
                                                id='generativeRegex'
                                                placeholder='Regex used to generate random values.'
                                                rows={3}
                                                {...register('generativeRegex')}
                                                aria-invalid={Boolean(
                                                    errors.generativeRegex,
                                                )}
                                            />
                                        </InputGroup>
                                        <FieldDescription>
                                            Regex used to generate random sample values
                                        </FieldDescription>
                                        {errors.generativeRegex && (
                                            <FieldError>
                                                {errors.generativeRegex.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            </>
                        )}

                        <Field data-invalid={Boolean(errors.children)}>
                            <FieldLabel htmlFor='children'>Children</FieldLabel>
                            <Controller
                                name='children'
                                control={control}
                                render={({ field }) => (
                                    <MultipleSelector
                                        value={
                                            (field.value?.map((c) => ({
                                                value: c.value,
                                                label: c.label,
                                            })) || []) as Option[]
                                        }
                                        defaultOptions={entryTypes as Option[]}
                                        placeholder='Select child entry types...'
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
                                )}
                            />
                            <FieldDescription>
                                Entry types that can be children of this type
                            </FieldDescription>
                            {errors.children && (
                                <FieldError>{errors.children.message}</FieldError>
                            )}
                        </Field>
                    </FieldGroup>
                </div>
            </div>

            <div className='flex justify-end mt-5 shrink-0'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Entry'}
                </Button>
            </div>
        </form>
    );
}
