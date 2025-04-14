import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { HexColorPicker } from 'react-colorful';
import {
    getEntryClass,
    getEntryClasses,
    createArtifactClass,
    editArtifactClass,
} from '../../services/adminService/adminService';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { GoldenRatioColorGenerator } from '../../utils/colorUtils/colorUtils';
import { Tabs, Tab } from '../Tabs/Tabs';
import Selector from '../Selector/Selector'; // imported Selector

const entryTypeSchema = Yup.object().shape({
    type: Yup.string().required('Class Type is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().notRequired(),
    prefix: Yup.string().notRequired(),
    typeFormat: Yup.string().nullable(),
    regex: Yup.string().when('typeFormat', {
        is: (val) => val === 'regex',
        then: () =>
            Yup.string().required('This field is required when regex is selected'),
        otherwise: () => Yup.string().notRequired(),
    }),
    options: Yup.string().when('typeFormat', {
        is: (val) => val === 'options',
        then: () =>
            Yup.string().required('This field is required when options is selected'),
        otherwise: () => Yup.string().notRequired(),
    }),
    generativeRegex: Yup.string().notRequired(),
    color: Yup.string().required('Color is required'),
    children: Yup.array().notRequired(), // added children validation
});

/**
 * EntryTypeForm component
 *
 * @param {Object} props
 * @param {boolean} [props.isEdit=false] - If true, the form will be used for editing.
 */
export default function EntryTypeForm({ id = null, isEdit = false, onAdd }) {
    const navigate = useNavigate();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [entryTypes, setEntryTypes] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    // Fetch all entry types for the Children selector.
    const fetchEntryTypes = async (q) => {
        try {
            const response = await getEntryClasses();
            if (response.status === 200 && response.data) {
                setEntryTypes(
                    response.data.map((entry) => ({
                        value: entry.subtype,
                        label: `${entry.subtype}`,
                    })),
                );
            } else {
                return [];
            }
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
    } = useForm({
        resolver: yupResolver(entryTypeSchema),
        defaultValues: {
            type: 'artifact',
            subtype: '',
            catalystType: '',
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
            getEntryClass(id)
                .then((response) => {
                    if (response.status === 200 && response.data) {
                        const entrytype = response.data;
                        reset({
                            type: entrytype.type,
                            subtype: entrytype.subtype,
                            catalystType: entrytype.catalyst_type,
                            description: entrytype.description,
                            prefix: entrytype.prefix,
                            color: entrytype.color,
                            generativeRegex: entrytype.generative_regex || '',
                            typeFormat:
                                entrytype.regex && entrytype.regex.length > 0
                                    ? 'regex'
                                    : entrytype.options && entrytype.options.length > 0
                                      ? 'options'
                                      : '',
                            regex: entrytype.regex,
                            options: entrytype.options,
                            children:
                                entrytype.children_detail.map((x) => ({
                                    value: x.subtype,
                                    label: x.subtype,
                                })) || [], // prepopulate children if available
                        });
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        } else {
            reset({
                type: 'artifact',
                subtype: '',
                catalystType: '',
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
    }, [isEdit, id, reset, navigate]);

    const onSubmit = async (data) => {
        try {
            let result = null;

            if (isEdit) {
                result = await editArtifactClass(
                    {
                        generative_regex: data.generativeRegex,
                        ...data,
                        children: data.children.map((child) => child.value),
                    },
                    id,
                );
            } else {
                result = await createArtifactClass({
                    generative_regex: data.generativeRegex,
                    ...data,
                    children: data.children.map((child) => child.value),
                });
            }

            if (result.status === 200) {
              setAlert({
                  show: true,
                  message: 'Entry Type saved successfully!',
                  color: 'green',
              });
              if (!isEdit)
                onAdd(result.data);
            } else {
              setAlert({
                  show: true,
                  message: 'Failed to save Entry Type.',
                  color: 'red',
              });
            }
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
                        <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
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
                                    name='subtype'
                                    labelText={isEdit ? 'Name' : 'Subtype'}
                                    className='form-input input input-ghost-primary input-block focus:ring-0'
                                    {...register('subtype')}
                                    error={errors.subtype?.message}
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
                                            name='prefix'
                                            labelText='Prefix'
                                            className='form-input input input-ghost-primary input-block focus:ring-0'
                                            {...register('prefix')}
                                            error={errors.prefix?.message}
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
                                                field: { onChange, value, ref },
                                            }) => (
                                                <Selector
                                                    value={value}
                                                    onChange={onChange}
                                                    staticOptions={entryTypes}
                                                    isMulti={true}
                                                    placeholder='Select child entry types...'
                                                    inputRef={ref}
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
