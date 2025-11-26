import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';
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
import AlertBox from '../../../base/Alert/AlertBox';
import FormField from '../../../forms/FormField';
import Selector from '../../../forms/Selector';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';

// Local Alert interface for component state
interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface EntryTypeFormProps {
    id?: string | null;
    isEdit?: boolean;
    onAdd?: (result: EntryClass) => void;
}

interface ChildOption {
    value: string;
    label: string;
}

interface EntryTypeFormValues {
    type: EntryClassRequestTypeEnum;
    subtype: string;
    description?: string;
    prefix?: string;
    typeFormat?: string | null;
    regex?: string;
    options?: string;
    generativeRegex?: string;
    color: string;
    children?: ChildOption[];
}

const entryTypeSchema: Yup.ObjectSchema<EntryTypeFormValues> = Yup.object().shape({
    type: Yup.string()
        .oneOf(Object.values(EntryClassRequestTypeEnum))
        .required('Class Type is required') as Yup.Schema<EntryClassRequestTypeEnum>,
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().notRequired(),
    prefix: Yup.string().notRequired(),
    typeFormat: Yup.string().nullable().notRequired(),
    regex: Yup.string().when('typeFormat', {
        is: (val: string | null) => val === 'regex',
        then: (schema) =>
            schema.required('This field is required when regex is selected'),
        otherwise: (schema) => schema.notRequired(),
    }),
    options: Yup.string().when('typeFormat', {
        is: (val: string | null) => val === 'options',
        then: (schema) =>
            schema.required('This field is required when options is selected'),
        otherwise: (schema) => schema.notRequired(),
    }),
    generativeRegex: Yup.string().notRequired(),
    color: Yup.string().required('Color is required'),
    children: Yup.array().notRequired(),
}) as Yup.ObjectSchema<EntryTypeFormValues>;

/**
 * EntryTypeForm component
 */
export default function EntryTypeForm({
    id = null,
    isEdit = false,
    onAdd,
}: EntryTypeFormProps) {
    const { entriesApi } = useApi();
    const { navigate } = useCradleNavigate();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [entryTypes, setEntryTypes] = useState<ChildOption[]>([]);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    // Fetch all entry types for the Children selector.
    const fetchEntryTypes = async () => {
        try {
            const entries = await entriesApi.entryClassesList({});
            setEntryTypes(
                entries.map((entry: EntryClass) => ({
                    value: entry.subtype,
                    label: `${entry.subtype}`,
                })),
            );
        } catch (err) {
            displayError(setAlert, navigate)(err);
            return [];
        }
    };

    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<EntryTypeFormValues>({
        resolver: yupResolver(entryTypeSchema),
        defaultValues: {
            type: EntryClassRequestTypeEnum.Artifact,
            subtype: '',
            description: '',
            prefix: '',
            typeFormat: '',
            regex: '',
            options: '',
            generativeRegex: '',
            color: colorGenerator.nextHexColor(),
            children: [], // added default for children
        },
    });

    const watchType = watch('type');
    const watchTypeFormat = watch('typeFormat');
    const watchColor = watch('color');

    // Generate a new random color
    const generateRandomColor = () => {
        const newColor = colorGenerator.nextHexColor();
        setValue('color', newColor);
    };

    // In edit mode, fetch the entry type details and prepopulate the form.
    useEffect(() => {
        if (isEdit && id) {
            entriesApi
                .entryClassesRetrieve({ classSubtype: id })
                .then((entrytype: EntryClass) => {
                    reset({
                        type: entrytype.type as EntryClassRequestTypeEnum,
                        subtype: entrytype.subtype,
                        description: entrytype.description || '',
                        prefix: entrytype.prefix || '',
                        color: entrytype.color || '',
                        generativeRegex: entrytype.generativeRegex || '',
                        typeFormat: entrytype.format || '',
                        regex: entrytype.regex || '',
                        options: entrytype.options || '',
                        children:
                            entrytype.childrenDetail?.map((x: any) => ({
                                value: x.subtype,
                                label: x.subtype,
                            })) || [], // prepopulate children if available
                    });
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        } else {
            reset({
                type: EntryClassRequestTypeEnum.Artifact,
                subtype: '',
                description: '',
                prefix: '',
                typeFormat: '',
                regex: '',
                options: '',
                generativeRegex: '',
                color: colorGenerator.nextHexColor(),
                children: [], // default empty children
            });
        }
        setAlert({ show: false, message: '', color: 'red' });
        fetchEntryTypes();
    }, [isEdit, id, reset, navigate, entriesApi, colorGenerator]);

    const onSubmit = async (data: EntryTypeFormValues) => {
        try {
            const payload: EntryClassRequest = {
                generativeRegex: data.generativeRegex,
                format: data.typeFormat === '' ? null : data.typeFormat ?? null,
                type: data.type,
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
            } else {
                result = await entriesApi.entryClassesCreate({
                    entryClassRequest: payload,
                });
            }

            setAlert({
                show: true,
                message: 'Entry Type saved successfully!',
                color: 'green',
            });
            if (!isEdit && onAdd) onAdd(result);
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    {isEdit ? 'Edit Entry Type' : 'Add New Entry Type'}
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                        <Tabs tabClass={TabClasses.PILL}>
                            <Tab title='Basic' classes='space-y-4'>
                                <div className='mt-4' />
                                <div className='w-full'>
                                    <label
                                        htmlFor='type'
                                        className='block text-sm font-medium'
                                    >
                                        Class Type
                                    </label>
                                    <div className='mt-1'>
                                        <select
                                            className='form-select select select-ghost-primary select-block focus:ring-0'
                                            {...register('type')}
                                        >
                                            <option value='artifact'>Artifact</option>
                                            <option value='entity'>Entity</option>
                                        </select>
                                        {errors.type && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.type.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='mt-4' />

                                <FormField
                                    type='text'
                                    id='subtype'
                                    label={isEdit ? 'Name' : 'Subtype'}
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    {...register('subtype')}
                                    error={errors.subtype}
                                />

                                <div className='mt-4' />

                                <div className='w-full'>
                                    <label
                                        htmlFor='description'
                                        className='block text-sm font-medium'
                                    >
                                        Description
                                    </label>
                                    <div className='mt-1'>
                                        <textarea
                                            placeholder='Description'
                                            className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                            {...register('description')}
                                        />
                                        {errors.description && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className='mt-2' />

                                {showColorPicker && (
                                    <div
                                        className='absolute z-10'
                                        style={{
                                            left: '74%',
                                            bottom: '14%',
                                            marginLeft: '8px',
                                        }}
                                    >
                                        <div
                                            className='fixed inset-0'
                                            onClick={() => setShowColorPicker(false)}
                                        />
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
                                )}

                                <div className='w-full'>
                                    <label
                                        htmlFor='color'
                                        className='block text-sm font-medium'
                                    >
                                        Color
                                    </label>
                                    <div className='mt-1 flex items-center space-x-2'>
                                        <Controller
                                            name='color'
                                            control={control}
                                            render={({ field }) => (
                                                <input
                                                    type='text'
                                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                                    {...field}
                                                />
                                            )}
                                        />
                                        <div
                                            className='h-8 w-12 rounded cursor-pointer border border-gray-300'
                                            style={{ backgroundColor: watchColor }}
                                            onClick={() =>
                                                setShowColorPicker(!showColorPicker)
                                            }
                                        />
                                        <button
                                            type='button'
                                            className='btn btn-sm btn-outline'
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
                                </div>
                                <div className='mt-4' />
                                {errors.color && (
                                    <p className='text-red-600 text-sm'>
                                        {errors.color.message}
                                    </p>
                                )}
                            </Tab>
                            <Tab title='Advanced'>
                                {watchType === 'entity' && (
                                    <div className='mt-4'>
                                        <FormField
                                            type='text'
                                            id='prefix'
                                            label='Prefix'
                                            className='form-input input input-ghost-primary input-block focus:ring-0'
                                            {...register('prefix')}
                                            error={errors.prefix}
                                        />
                                    </div>
                                )}

                                {watchType === 'artifact' && (
                                    <div className='w-full mt-4'>
                                        <label
                                            htmlFor='typeFormat'
                                            className='block text-sm font-medium'
                                        >
                                            Format
                                        </label>
                                        <div className='mt-1'>
                                            <select
                                                className='form-select select select-ghost-primary select-block focus:ring-0'
                                                {...register('typeFormat')}
                                            >
                                                <option value=''>Any Format</option>
                                                <option value='options'>
                                                    Enumerator
                                                </option>
                                                <option value='regex'>Regex</option>
                                            </select>
                                            {errors.typeFormat && (
                                                <p className='text-red-600 text-sm'>
                                                    {errors.typeFormat.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {watchType === 'artifact' &&
                                    watchTypeFormat === 'options' && (
                                        <div className='w-full mt-4'>
                                            <label
                                                htmlFor='options'
                                                className='block text-sm font-medium'
                                            >
                                                Options
                                            </label>
                                            <div className='mt-1'>
                                                <textarea
                                                    placeholder='Enter possible values separated by newlines.'
                                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                                    {...register('options')}
                                                />
                                                {errors.options && (
                                                    <p className='text-red-600 text-sm'>
                                                        {errors.options.message ||
                                                            'Please enter the possible values.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {watchType === 'artifact' &&
                                    watchTypeFormat === 'regex' && (
                                        <div className='w-full mt-4'>
                                            <label
                                                htmlFor='regex'
                                                className='block text-sm font-medium'
                                            >
                                                Regex
                                            </label>
                                            <div className='mt-1'>
                                                <textarea
                                                    placeholder='Enter the regex for the type.'
                                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                                    {...register('regex')}
                                                />
                                                {errors.regex && (
                                                    <p className='text-red-600 text-sm'>
                                                        {errors.regex.message ||
                                                            'Please enter the regex.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {watchType === 'artifact' &&
                                    watchTypeFormat !== 'options' && (
                                        <div className='w-full mt-4'>
                                            <label
                                                htmlFor='generativeRegex'
                                                className='block text-sm font-medium'
                                            >
                                                Generative Regex
                                            </label>
                                            <div className='mt-1'>
                                                <textarea
                                                    placeholder='Regex used to generate random values.'
                                                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                                    {...register('generativeRegex')}
                                                />
                                                {errors.generativeRegex && (
                                                    <p className='text-red-600 text-sm'>
                                                        {errors.generativeRegex.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Children Selector Field */}
                                <div className='w-full mt-4'>
                                    <label
                                        htmlFor='children'
                                        className='block text-sm font-medium'
                                    >
                                        Children
                                    </label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='children'
                                            control={control}
                                            render={({
                                                field: { onChange, value },
                                            }) => (
                                                <Selector
                                                    value={value}
                                                    onChange={onChange}
                                                    staticOptions={entryTypes}
                                                    isMulti={true}
                                                    placeholder='Select child entry types...'
                                                />
                                            )}
                                        />
                                        {errors.children && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.children.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Tab>
                        </Tabs>

                        <AlertBox alert={alert} />

                        <div className='flex gap-2 pt-4'>
                            <button type='submit' className='btn btn-primary btn-block'>
                                {isEdit ? 'Edit' : 'Add'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
