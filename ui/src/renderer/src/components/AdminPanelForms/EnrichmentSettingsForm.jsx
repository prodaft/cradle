import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getEntryClasses } from '../../services/adminService/adminService';
import {
    getEnrichmentSettings,
    saveEnrichmentSettings,
} from '../../services/intelioService/intelioService';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import Selector from '../Selector/Selector';
import { Tab, Tabs } from '../Tabs/Tabs';

// Dynamic schema generation based on form_fields
const createEnrichmentSchema = (form_fields) => {
    const schemaFields = {
        strategy: Yup.string().required('Strategy is required'),
        for_eclasses: Yup.array().notRequired(),
        settings: Yup.object().shape(
            Object.entries(form_fields || {}).reduce((acc, [key, field]) => {
                let validator = Yup.string();

                if (field.type === 'number') {
                    validator = Yup.number();
                } else if (field.type === 'choice') {
                    validator = Yup.string();
                }

                if (field.required) {
                    validator = validator.required(`${key} is required`);
                }

                acc[key] = validator;
                return acc;
            }, {}),
        ),
    };

    // Add periodicity validation if it exists
    schemaFields.periodicity = Yup.string().when('strategy', {
        is: (val) => val === 'periodicity',
        then: () => Yup.string().required('Interval is required'),
        otherwise: () => Yup.string().notRequired(),
    });

    return Yup.object().shape(schemaFields);
};

/**
 * EnrichmentSettingsForm component
 *
 * @param {Object} props
 * @param {string} props.enrichment_class - The enrichment class to fetch settings for
 */
export default function EnrichmentSettingsForm({ enrichment_class }) {
    const { navigate, navigateLink } = useCradleNavigate();
    const [displayName, setDisplayName] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [formFields, setFormFields] = useState({});
    const [loading, setLoading] = useState(true);

    // For dynamic form validation
    const [validationSchema, setValidationSchema] = useState(
        createEnrichmentSchema({}),
    );

    // Setup form with resolver
    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            strategy: 'manual',
            periodicity: '24:00:00',
            for_eclasses: [],
            settings: {},
        },
    });

    const watchStrategy = watch('strategy');

    // Fetch all entry classes for the for_eclasses selector
    const fetchEntryClasses = async (q) => {
        try {
            const response = await getEntryClasses();
            if (response.status === 200 && response.data) {
                return response.data
                    .filter((x) => x.subtype.startsWith(q))
                    .map((entry) => ({
                        value: entry.subtype,
                        label: `${entry.subtype}`,
                    }));
            } else {
                return [];
            }
        } catch (err) {
            displayError(setAlert, navigate)(err);
            return [];
        }
    };

    // Fetch enrichment settings
    useEffect(() => {
        if (enrichment_class) {
            setLoading(true);
            getEnrichmentSettings(enrichment_class)
                .then((response) => {
                    if (response.status === 200 && response.data) {
                        const settings = response.data;

                        setDisplayName(settings.display_name || '');

                        // Set form fields for validation schema
                        setFormFields(settings.form_fields || {});

                        // Update validation schema based on form_fields
                        setValidationSchema(
                            createEnrichmentSchema(settings.form_fields || {}),
                        );

                        // Initialize settings object with defaults
                        const initialSettings = {};
                        Object.keys(settings.form_fields || {}).forEach((key) => {
                            initialSettings[key] = settings.settings?.[key] || '';
                        });

                        // Format for_eclasses for the selector
                        const formattedEclasses =
                            settings.for_eclasses_detail?.map((eclass) => ({
                                value: eclass.subtype,
                                label: eclass.subtype,
                            })) || [];

                        // Set form values
                        reset({
                            strategy: settings.strategy || 'manual',
                            periodicity: settings.periodicity || '24:00:00',
                            for_eclasses: formattedEclasses,
                            enabled: settings.enabled || false,
                            settings: initialSettings,
                            id: settings.id,
                        });
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    displayError(setAlert, navigate)(err);
                    setLoading(false);
                });
        }
    }, [enrichment_class, reset, navigate]);

    const onSubmit = async (data) => {
        try {
            const formatted_data = {
                ...data,
                for_eclasses: data.for_eclasses.map((item) => item.value),
            };

            await saveEnrichmentSettings(enrichment_class, formatted_data);
            setAlert({
                show: true,
                message: 'Enrichment settings saved successfully!',
                color: 'green',
            });
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    // Render form fields based on form_fields configuration
    const renderSettingsFields = () => {
        return Object.entries(formFields).map(([key, field]) => {
            if (field.type === 'choice') {
                return (
                    <div className='w-full mt-4' key={key}>
                        <label
                            htmlFor={`settings.${key}`}
                            className='block text-sm font-medium'
                        >
                            {capitalizeString(key)}
                        </label>
                        <div className='mt-1'>
                            <select
                                className='form-select select select-ghost-primary select-block focus:ring-0'
                                {...register(`settings.${key}`)}
                            >
                                {field.options?.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            {errors.settings?.[key] && (
                                <p className='text-red-600 text-sm'>
                                    {errors.settings[key].message}
                                </p>
                            )}
                        </div>
                    </div>
                );
            } else if (field.type === 'number') {
                return (
                    <>
                        <div className='mt-4' />
                        <FormField
                            key={key}
                            type='number'
                            name={`settings.${key}`}
                            labelText={capitalizeString(key)}
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register(`settings.${key}`)}
                            error={errors.settings?.[key]?.message}
                        />
                    </>
                );
            } else {
                // Default to string input
                return (
                    <>
                        <div className='mt-4' />
                        <FormField
                            key={key}
                            type='text'
                            name={`settings.${key}`}
                            labelText={capitalizeString(key)}
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register(`settings.${key}`)}
                            error={errors.settings?.[key]?.message}
                        />
                    </>
                );
            }
        });
    };

    if (loading) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
                Loading enrichment settings...
            </div>
        );
    }

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    {displayName} Settings
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-blur-sm rounded-md'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                        <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                            <Tab title='General' classes='space-y-4'>
                                <div className='mt-4' />
                                <div className='w-full'>
                                    <label
                                        htmlFor='strategy'
                                        className='block text-sm font-medium'
                                    >
                                        Strategy
                                    </label>
                                    <div className='mt-1'>
                                        <select
                                            className='form-select select select-ghost-primary select-block focus:ring-0'
                                            {...register('strategy')}
                                        >
                                            <option value='manual'>Manual</option>
                                            <option value='on_create'>On Create</option>
                                            <option value='periodic'>Periodic</option>
                                        </select>
                                        {errors.strategy && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.strategy.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {watchStrategy === 'periodic' && (
                                    <div className='mt-4'>
                                        <FormField
                                            type='string'
                                            name='periodicity'
                                            labelText='Interval'
                                            className='form-input input input-ghost-primary input-block focus:ring-0'
                                            {...register('periodicity')}
                                            error={errors.periodicity?.message}
                                        />
                                    </div>
                                )}

                                <div className='mt-4' />

                                <FormField
                                    type='checkbox'
                                    labelText='Enabled'
                                    className='switch switch-ghost-primary'
                                    {...register('enabled')}
                                    row={true}
                                    error={errors.enabled?.message}
                                />

                                <div className='w-full mt-4'>
                                    <label
                                        htmlFor='for_eclasses'
                                        className='block text-sm font-medium'
                                    >
                                        Entry Classes
                                    </label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='for_eclasses'
                                            control={control}
                                            render={({
                                                field: { onChange, value, ref },
                                            }) => (
                                                <Selector
                                                    value={value}
                                                    onChange={onChange}
                                                    fetchOptions={fetchEntryClasses}
                                                    isMulti={true}
                                                    placeholder='Select entry classes...'
                                                    inputRef={ref}
                                                />
                                            )}
                                        />
                                        {errors.for_eclasses && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.for_eclasses.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Tab>
                            {Object.keys(formFields).length > 0 && (
                                <Tab title='Settings' classes='space-y-4'>
                                    <div className='mt-4' />
                                    {renderSettingsFields()}
                                </Tab>
                            )}
                        </Tabs>

                        <AlertBox alert={alert} />

                        <div className='flex gap-2 pt-4'>
                            <button type='submit' className='btn btn-primary btn-block'>
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
