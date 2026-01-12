import PageHeader from '@/components/base/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import { z } from 'zod';
import OfflineIndicator from '../../../feedback/OfflineIndicator';
import {
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsTextArea,
} from '../../../forms';

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
    const [isLoading, setIsLoading] = useState(true);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorButtonRef = useRef<HTMLDivElement>(null);

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

    const fetchEntryTypesMutation = useMutation({
        mutationFn: async () => {
            const entries = await entriesApi.entryClassesList({});
            return entries.map((entry) => ({
                value: entry.subtype,
                label: entry.subtype,
            }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    // Fetch all entry types for the Children selector
    const fetchEntryTypes = async () => {
        try {
            const entryTypes = await fetchEntryTypesMutation.mutateAsync();
            setEntryTypes(entryTypes);
        } catch (err) {
            // Error already handled
        }
    };

    // Fetch entry type details in edit mode
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await fetchEntryTypes();
            if (entryTypeData) {
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
            }
            setIsLoading(false);
        };

        loadData();
    }, [id, entryTypeData, colorGenerator, reset]);

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
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
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
    const watchColor = watch('color');
    const isArtifact = watchType?.value === EntryClassRequestTypeEnum.Artifact;
    const isEntity = watchType?.value === EntryClassRequestTypeEnum.Entity;
    const isOptions = watchTypeFormat?.value === 'options';
    const isRegex = watchTypeFormat?.value === 'regex';

    const generateRandomColor = () => {
        setValue('color', colorGenerator.nextHexColor());
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    const pageTitle = entryTypeData?.subtype || id || 'Entry Type';
    const pageDescription =
        entryTypeData?.description || 'Edit entry type configuration';

    return (
        <div className='w-full h-full flex flex-col'>
            <PageHeader title={pageTitle} description={pageDescription} />
            {/* Content Area */}
            <div className='p-5 flex-1 overflow-auto'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit)}>
                        {/* Basic Section */}
                        <section id='basic' className='pb-8'>
                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsField
                                        label='Class Type'
                                        description='Artifact or Entity classification'
                                        required
                                        error={errors.type?.message?.toString()}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='type'
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value?.value || ''}
                                                    onValueChange={(value) => {
                                                        const option = typeOptions.find(
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
                                                        className='w-72'
                                                        aria-invalid={Boolean(
                                                            errors.type,
                                                        )}
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
                                            )}
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <SettingsField
                                        label='Name'
                                        description='Unique identifier for this entry class'
                                        {...register('subtype')}
                                        error={errors.subtype}
                                        required
                                    />

                                    <Separator />

                                    <SettingsTextArea
                                        label='Description'
                                        description='Brief explanation of this entry type'
                                        placeholder='Description'
                                        rows={3}
                                        {...register('description')}
                                        error={errors.description}
                                        layout='vertical'
                                    />

                                    <Separator />

                                    <div className='py-2'>
                                        <Label className='text-sm text-muted-foreground block mb-0.5'>
                                            Color
                                            <span className='text-destructive ml-1'>
                                                *
                                            </span>
                                        </Label>
                                        <p className='text-sm text-muted-foreground mb-2'>
                                            Display color for this entry type
                                        </p>
                                        <div className='flex items-center space-x-2'>
                                            <Controller
                                                name='color'
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        type='text'
                                                        className='w-full text-sm h-10 rounded-full'
                                                        {...field}
                                                    />
                                                )}
                                            />
                                            <div
                                                ref={colorButtonRef}
                                                className='h-10 w-12 rounded cursor-pointer border border-border flex-shrink-0'
                                                style={{ backgroundColor: watchColor }}
                                                onClick={() =>
                                                    setShowColorPicker(!showColorPicker)
                                                }
                                            />
                                            <Button
                                                type='button'
                                                variant='outline'
                                                size='default'
                                                className='h-10 px-3 flex-shrink-0'
                                                onClick={generateRandomColor}
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
                                            </Button>
                                        </div>
                                        {showColorPicker &&
                                            colorButtonRef.current &&
                                            (() => {
                                                const buttonRect =
                                                    colorButtonRef.current!.getBoundingClientRect();
                                                const pickerWidth = 200; // Approximate width of HexColorPicker
                                                const pickerHeight = 200; // Approximate height of HexColorPicker

                                                // Calculate horizontal position
                                                let leftPos = buttonRect.left;
                                                // If picker would go off the right edge, align it to the right of the button
                                                if (
                                                    leftPos + pickerWidth >
                                                    window.innerWidth
                                                ) {
                                                    leftPos =
                                                        buttonRect.right - pickerWidth;
                                                }
                                                // Ensure it doesn't go off the left edge either
                                                leftPos = Math.max(8, leftPos);

                                                // Calculate vertical position (above the button)
                                                const bottomPos =
                                                    window.innerHeight -
                                                    buttonRect.top +
                                                    8;

                                                return (
                                                    <>
                                                        <div
                                                            className='fixed inset-0 z-10'
                                                            onClick={() =>
                                                                setShowColorPicker(
                                                                    false,
                                                                )
                                                            }
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
                                                                        color={
                                                                            field.value
                                                                        }
                                                                        onChange={
                                                                            field.onChange
                                                                        }
                                                                    />
                                                                )}
                                                            />
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        {errors.color && (
                                            <p className='text-sm text-destructive mt-1'>
                                                {errors.color.message}
                                            </p>
                                        )}
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Advanced Section */}
                        <section
                            id='advanced'
                            className='border-t border-white/5 pt-5 pb-8'
                        >
                            <div className='space-y-4'>
                                <SettingsCard>
                                    {isEntity && (
                                        <>
                                            <SettingsField
                                                label='Prefix'
                                                description='Prefix used when generating entity names'
                                                {...register('prefix')}
                                                error={errors.prefix}
                                            />
                                        </>
                                    )}

                                    {isArtifact && (
                                        <>
                                            <SettingsField
                                                label='Format'
                                                description='Validation format for artifact values'
                                                inputWidth='w-72'
                                            >
                                                <Controller
                                                    name='typeFormat'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            value={
                                                                field.value?.value || ''
                                                            }
                                                            onValueChange={(value) => {
                                                                const option =
                                                                    formatOptions.find(
                                                                        (opt) =>
                                                                            opt.value ===
                                                                            value,
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
                                                                aria-invalid={Boolean(
                                                                    errors.typeFormat,
                                                                )}
                                                            >
                                                                <SelectValue placeholder='Select format' />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {formatOptions.map(
                                                                    (option) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </SettingsField>

                                            {isOptions && (
                                                <>
                                                    <Separator />
                                                    <SettingsTextArea
                                                        label='Options'
                                                        description='Allowed values (one per line)'
                                                        placeholder='Enter possible values separated by newlines.'
                                                        rows={6}
                                                        {...register('options')}
                                                        error={errors.options}
                                                        layout='vertical'
                                                    />
                                                </>
                                            )}

                                            {isRegex && (
                                                <>
                                                    <Separator />
                                                    <SettingsTextArea
                                                        label='Regex'
                                                        description='Regular expression for validation'
                                                        placeholder='Enter the regex for the type.'
                                                        rows={3}
                                                        {...register('regex')}
                                                        error={errors.regex}
                                                        layout='vertical'
                                                    />
                                                </>
                                            )}

                                            {!isOptions && (
                                                <>
                                                    <Separator />
                                                    <SettingsTextArea
                                                        label='Generative Regex'
                                                        description='Regex used to generate random sample values'
                                                        placeholder='Regex used to generate random values.'
                                                        rows={3}
                                                        {...register('generativeRegex')}
                                                        error={errors.generativeRegex}
                                                        layout='vertical'
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}

                                    {((isEntity && isArtifact === false) ||
                                        isArtifact) && <Separator />}

                                    <div className='py-2'>
                                        <Label className='text-sm text-muted-foreground block mb-0.5'>
                                            Children
                                        </Label>
                                        <p className='text-sm text-muted-foreground mb-2'>
                                            Entry types that can be children of this
                                            type
                                        </p>
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
                                                    defaultOptions={
                                                        entryTypes as Option[]
                                                    }
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
                                        {errors.children && (
                                            <p className='text-sm text-destructive mt-1'>
                                                {errors.children.message}
                                            </p>
                                        )}
                                    </div>
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
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
