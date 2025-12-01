import { Tab, Tabs } from '@/components/layout/Tabs/Tabs';
import { TabClasses } from '@/components/layout/Tabs/types';
import useApi from '@/hooks/api/useApi';
import { capitalizeString } from '@/utils/dashboard';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { FormAlert, FormAlertState, SelectOption } from '../../../forms';
import Selector from '../../../forms/Selector';

interface EnrichmentSettingsFormProps {
    enrichment_class: string;
}

interface EclassOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FormField {
    type: 'string' | 'number' | 'choice';
    required?: boolean;
    options?: string[];
}

interface FormFields {
    [key: string]: FormField;
}

interface FormData {
    for_eclasses: EclassOption[];
    enabled: boolean;
    settings: Record<string, any>;
    id?: string;
}

// Dynamic schema generation based on form_fields
const createEnrichmentSchema = (form_fields: FormFields) => {
    const settingsShape = Object.entries(form_fields || {}).reduce(
        (acc, [key, field]) => {
            let validator: Yup.AnySchema = Yup.string();

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
        },
        {} as Record<string, Yup.AnySchema>,
    );

    return Yup.object().shape({
        for_eclasses: Yup.array().default([]),
        enabled: Yup.boolean().default(false),
        id: Yup.string(),
        settings: Yup.object().shape(settingsShape),
    });
};

export default function EnrichmentSettingsForm({
    enrichment_class,
}: EnrichmentSettingsFormProps) {
    const { intelioApi, entriesApi } = useApi();
    const [displayName, setDisplayName] = useState('');
    const [alert, setAlert] = useState<FormAlertState>({ type: null, message: '' });
    const [formFields, setFormFields] = useState<FormFields>({});
    const [loading, setLoading] = useState(true);
    const [validationSchema, setValidationSchema] = useState(
        createEnrichmentSchema({}),
    );

    const methods = useForm<FormData>({
        resolver: yupResolver(validationSchema) as any,
        defaultValues: {
            for_eclasses: [],
            enabled: false,
            settings: {},
        },
    });

    const {
        handleSubmit,
        control,
        reset,
        register,
        formState: { errors },
    } = methods;

    // Fetch all entry classes for the for_eclasses selector
    const fetchEntryClasses = async (q: string): Promise<EclassOption[]> => {
        try {
            const response = await entriesApi.entryClassesList({});
            if (response) {
                return response
                    .filter((x) => x.subtype.startsWith(q))
                    .map((entry) => ({
                        value: entry.subtype,
                        label: entry.subtype,
                    }));
            } else {
                return [];
            }
        } catch (err) {
            console.error('Failed to fetch entry classes:', err);
            return [];
        }
    };

    // Fetch enrichment settings
    useEffect(() => {
        if (enrichment_class) {
            setLoading(true);
            intelioApi
                .enrichmentSettingsRetrieve({ enricherType: enrichment_class })
                .then((settings) => {
                    if (settings) {
                        setDisplayName(settings.displayName || '');
                        setFormFields(settings.formFields || {});
                        setValidationSchema(
                            createEnrichmentSchema(settings.formFields || {}),
                        );

                        // Initialize settings object with defaults
                        const initialSettings: Record<string, string | number> = {};
                        Object.keys(settings.formFields || {}).forEach((key) => {
                            initialSettings[key] = settings.settings?.[key] || '';
                        });

                        // Format for_eclasses for the selector
                        const formattedEclasses =
                            settings.forEclassesDetail?.map((eclass) => ({
                                value: eclass.subtype,
                                label: eclass.subtype,
                            })) || [];

                        // Set form values
                        reset({
                            for_eclasses: formattedEclasses,
                            enabled: settings.enabled || false,
                            settings: initialSettings,
                            id: settings.id,
                        });
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    console.error('Failed to fetch enrichment settings:', err);
                    setAlert({
                        type: 'error',
                        message: 'Failed to load enrichment settings',
                    });
                    setLoading(false);
                });
        }
    }, [enrichment_class, reset, intelioApi]);

    const onSubmit = async (data: FormData) => {
        try {
            const formatted_data = {
                ...data,
                forEclasses: data.for_eclasses?.map((item) => item.value),
            };

            await intelioApi.enrichmentSettingsUpdate({
                enricherType: enrichment_class,
                enrichmentSettingsRequest: formatted_data,
            });
            setAlert({
                type: 'success',
                message: 'Enrichment settings saved successfully!',
            });
        } catch (err) {
            console.error('Failed to save enrichment settings:', err);
            setAlert({ type: 'error', message: 'Failed to save enrichment settings' });
        }
    };

    // Render form fields based on form_fields configuration
    const renderSettingsFields = () => {
        return Object.entries(formFields).map(([key, field]) => {
            if (field.type === 'choice') {
                return (
                    <div className='w-full' key={key}>
                        <label
                            htmlFor={`settings.${key}`}
                            className='block text-sm font-medium cradle-text-tertiary mb-1'
                        >
                            {capitalizeString(key)}
                            {field.required && (
                                <span className='text-red-500 ml-1'>*</span>
                            )}
                        </label>
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
                            <p className='text-red-600 text-sm mt-1'>
                                {errors.settings[key]?.message?.toString() || ''}
                            </p>
                        )}
                    </div>
                );
            } else if (field.type === 'number') {
                return (
                    <div className='w-full' key={key}>
                        <label
                            htmlFor={`settings.${key}`}
                            className='block text-sm font-medium cradle-text-tertiary mb-1'
                        >
                            {capitalizeString(key)}
                            {field.required && (
                                <span className='text-red-500 ml-1'>*</span>
                            )}
                        </label>
                        <input
                            type='number'
                            className='cradle-search w-full'
                            {...register(`settings.${key}`)}
                        />
                        {errors.settings?.[key] && (
                            <p className='text-red-600 text-sm mt-1'>
                                {errors.settings[key]?.message?.toString() || ''}
                            </p>
                        )}
                    </div>
                );
            } else {
                // Default to string input
                return (
                    <div className='w-full' key={key}>
                        <label
                            htmlFor={`settings.${key}`}
                            className='block text-sm font-medium cradle-text-tertiary mb-1'
                        >
                            {capitalizeString(key)}
                            {field.required && (
                                <span className='text-red-500 ml-1'>*</span>
                            )}
                        </label>
                        <input
                            type='text'
                            className='cradle-search w-full'
                            {...register(`settings.${key}`)}
                        />
                        {errors.settings?.[key] && (
                            <p className='text-red-600 text-sm mt-1'>
                                {errors.settings[key]?.message?.toString() || ''}
                            </p>
                        )}
                    </div>
                );
            }
        });
    };

    if (loading) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>
                    Loading enrichment settings...
                </div>
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
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                            <FormAlert
                                alert={alert}
                                onDismiss={() => setAlert({ type: null, message: '' })}
                            />

                            <Tabs tabClass={TabClasses.PILL}>
                                <Tab title='General' classes='space-y-4 pt-4'>
                                    <div className='w-full'>
                                        <label className='flex items-center justify-between gap-4 cursor-pointer'>
                                            <span className='cradle-label cradle-text-tertiary'>
                                                Enabled
                                            </span>
                                            <input
                                                type='checkbox'
                                                className='switch switch-ghost-primary'
                                                {...register('enabled')}
                                            />
                                        </label>
                                    </div>

                                    <div className='w-full'>
                                        <label className='block text-sm font-medium cradle-text-tertiary mb-1'>
                                            Entry Classes
                                        </label>
                                        <Controller
                                            name='for_eclasses'
                                            control={control}
                                            render={({
                                                field: { onChange, value },
                                            }) => (
                                                <Selector
                                                    value={value}
                                                    onChange={onChange}
                                                    fetchOptions={fetchEntryClasses}
                                                    isMulti={true}
                                                    placeholder='Select entry classes...'
                                                />
                                            )}
                                        />
                                        {errors.for_eclasses && (
                                            <p className='text-red-600 text-sm mt-1'>
                                                {errors.for_eclasses.message}
                                            </p>
                                        )}
                                    </div>
                                </Tab>

                                {Object.keys(formFields).length > 0 && (
                                    <Tab title='Settings' classes='space-y-4 pt-4'>
                                        {renderSettingsFields()}
                                    </Tab>
                                )}
                            </Tabs>

                            <div className='flex gap-2 pt-4'>
                                <button
                                    type='submit'
                                    className='btn btn-primary btn-block'
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </div>
            </div>
        </div>
    );
}
