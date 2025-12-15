import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import { GoldenRatioColorGenerator } from '@/utils/colors/colorUtils';
import { yupResolver } from '@hookform/resolvers/yup';
import {
    EntryClass,
    EntryClassRequest,
    EntryClassRequestTypeEnum,
} from '@services/cradle/models';
import { useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsSeparator,
    SettingsTextArea,
} from '../../../forms';
import Selector from '../../../forms/Selector';

interface EntryTypeFormProps {
    id?: string | null;
    isEdit?: boolean;
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

interface EntryTypeFormValues {
    type: TypeOption | null;
    subtype: string;
    description: string;
    prefix: string;
    typeFormat: FormatOption | null;
    regex: string;
    options: string;
    generativeRegex: string;
    color: string;
    children: ChildOption[];
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

const entryTypeSchema: Yup.ObjectSchema<EntryTypeFormValues> = Yup.object().shape({
    type: Yup.object()
        .shape({
            value: Yup.string()
                .required()
                .oneOf([
                    EntryClassRequestTypeEnum.Artifact,
                    EntryClassRequestTypeEnum.Entity,
                ]),
            label: Yup.string().required(),
        })
        .nullable()
        .required('Class Type is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().default(''),
    prefix: Yup.string().default(''),
    typeFormat: Yup.object()
        .shape({ value: Yup.string().required(), label: Yup.string().required() })
        .nullable()
        .default(null),
    regex: Yup.string().default(''),
    options: Yup.string().default(''),
    generativeRegex: Yup.string().default(''),
    color: Yup.string().required('Color is required'),
    children: Yup.array().default([]),
});


export default function EntryTypeForm({
    id = null,
    isEdit = false,
    onAdd,
}: EntryTypeFormProps) {
    const { entriesApi } = useApi();
    const { notify } = useNotif();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [entryTypes, setEntryTypes] = useState<ChildOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<EntryTypeFormValues>({
        resolver: yupResolver(entryTypeSchema),
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

    // Fetch all entry types for the Children selector
    const fetchEntryTypes = async () => {
        try {
            const entries = await entriesApi.entryClassesList({});
            setEntryTypes(
                entries.map((entry: EntryClass) => ({
                    value: entry.subtype,
                    label: entry.subtype,
                })),
            );
        } catch (err) {
            console.error('Failed to fetch entry types:', err);
        }
    };

    // Fetch entry type details in edit mode
    useEffect(() => {
        const loadData = async () => {
            await fetchEntryTypes();

            if (isEdit && id) {
                try {
                    const entrytype = await entriesApi.entryClassesRetrieve({
                        classSubtype: id,
                    });
                    reset({
                        type:
                            typeOptions.find((o) => o.value === entrytype.type) ||
                            typeOptions[0],
                        subtype: entrytype.subtype,
                        description: entrytype.description || '',
                        prefix: entrytype.prefix || '',
                        color: entrytype.color || colorGenerator.nextHexColor(),
                        generativeRegex: entrytype.generativeRegex || '',
                        typeFormat:
                            formatOptions.find((o) => o.value === entrytype.format) ||
                            formatOptions[0],
                        regex: entrytype.regex || '',
                        options: entrytype.options || '',
                        children:
                            entrytype.childrenDetail?.map((x: any) => ({
                                value: x.subtype,
                                label: x.subtype,
                            })) || [],
                    });
                } catch (err) {
                    console.error('Failed to fetch entry type:', err);
                }
            }
            setIsLoading(false);
        };

        loadData();
    }, [isEdit, id, entriesApi, colorGenerator, reset]);

    const onSubmit = async (data: EntryTypeFormValues) => {
        try {
            const payload: EntryClassRequest = {
                generativeRegex: data.generativeRegex,
                format:
                    data.typeFormat?.value === 'any'
                        ? null
                        : data.typeFormat?.value ?? null,
                type: data.type?.value || EntryClassRequestTypeEnum.Artifact,
                subtype: data.subtype,
                description: data.description,
                prefix: data.prefix,
                color: data.color,
                regex: data.regex,
                options: data.options,
                children: data.children?.map((child) => child.value) ?? [],
            };

            let result: EntryClass;
            if (isEdit && id) {
                result = await entriesApi.entryClassesUpdate({
                    classSubtype: id,
                    entryClassRequest: payload,
                });
                notify({
                    type: 'success',
                    text: 'Entry type updated successfully!',
                });
            } else {
                result = await entriesApi.entryClassesCreate({
                    entryClassRequest: payload,
                });
                notify({
                    type: 'success',
                    text: 'Entry type created successfully!',
                });
            }

            if (!isEdit && onAdd) onAdd(result);
        } catch (error) {
            notify({
                type: 'error',
                text: `Failed to ${isEdit ? 'update' : 'create'} entry type`,
            });
        }
    };

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

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        {isEdit ? 'Edit Entry Type' : 'New Entry Type'}
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        {isEdit ? 'Modify entry class definition' : 'Create new entry class'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit)}>
                        {/* Basic Section */}
                        <section id='basic' className='pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Basic Information
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Core properties of the entry type
                            </p>

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
                                                <Selector
                                                    {...field}
                                                    staticOptions={typeOptions}
                                                    placeholder='Select type'
                                                />
                                            )}
                                        />
                                    </SettingsField>

                                    <SettingsSeparator />

                                    <SettingsField
                                        label={isEdit ? 'Name' : 'Subtype'}
                                        description='Unique identifier for this entry class'
                                        {...register('subtype')}
                                        error={errors.subtype}
                                        required
                                    />

                                    <SettingsSeparator />

                                    <SettingsTextArea
                                        label='Description'
                                        description='Brief explanation of this entry type'
                                        placeholder='Description'
                                        rows={3}
                                        {...register('description')}
                                        error={errors.description}
                                        layout='vertical'
                                    />

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                            Color
                                            <span className='text-red-500 ml-1'>*</span>
                                        </label>
                                        <p className='text-sm cradle-text-muted mb-2'>
                                            Display color for this entry type
                                        </p>
                                        <div className='flex items-center space-x-2'>
                                            <Controller
                                                name='color'
                                                control={control}
                                                render={({ field }) => (
                                                    <input
                                                        type='text'
                                                        className='cradle-input w-full text-sm h-10 rounded-full'
                                                        {...field}
                                                    />
                                                )}
                                            />
                                            <div
                                                className='h-10 w-12 rounded cursor-pointer border border-gray-300 flex-shrink-0'
                                                style={{ backgroundColor: watchColor }}
                                                onClick={() => setShowColorPicker(!showColorPicker)}
                                            />
                                            <button
                                                type='button'
                                                className='cradle-btn cradle-btn-secondary h-10 px-3 flex-shrink-0'
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
                                            </button>
                                        </div>
                                        {showColorPicker && (
                                            <div className='relative mt-2'>
                                                <div
                                                    className='fixed inset-0 z-10'
                                                    onClick={() => setShowColorPicker(false)}
                                                />
                                                <div className='absolute z-20'>
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
                                            </div>
                                        )}
                                        {errors.color && (
                                            <p className='text-sm text-red-500 mt-1'>
                                                {errors.color.message}
                                            </p>
                                        )}
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Advanced Section */}
                        <section id='advanced' className='border-t border-white/5 pt-5 pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Advanced Settings
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Additional configuration and validation
                            </p>

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
                                                        <Selector
                                                            {...field}
                                                            staticOptions={formatOptions}
                                                            placeholder='Select format'
                                                            isClearable
                                                        />
                                                    )}
                                                />
                                            </SettingsField>

                                            {isOptions && (
                                                <>
                                                    <SettingsSeparator />
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
                                                    <SettingsSeparator />
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
                                                    <SettingsSeparator />
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

                                    {((isEntity && isArtifact === false) || isArtifact) && (
                                        <SettingsSeparator />
                                    )}

                                    <div className='py-2'>
                                        <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                            Children
                                        </label>
                                        <p className='text-sm cradle-text-muted mb-2'>
                                            Entry types that can be children of this type
                                        </p>
                                        <Controller
                                            name='children'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    {...field}
                                                    staticOptions={entryTypes}
                                                    placeholder='Select child entry types...'
                                                    isMulti
                                                />
                                            )}
                                        />
                                        {errors.children && (
                                            <p className='text-sm text-red-500 mt-1'>
                                                {errors.children.message}
                                            </p>
                                        )}
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary px-6 rounded-full'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Entry Type'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
