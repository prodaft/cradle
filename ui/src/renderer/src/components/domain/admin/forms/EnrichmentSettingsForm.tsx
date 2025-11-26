import AlertBox from '@/components/base/Alert/AlertBox';
import FormFieldComponent from '@/components/forms/FormField';
import Selector from '@/components/forms/Selector';
import { Tab, Tabs } from '@/components/layout/Tabs/Tabs';
import { TabClasses } from '@/components/layout/Tabs/types';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';
import { capitalizeString } from '@/utils/dashboard';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface EnrichmentSettingsFormProps {
    enrichment_class: string;
}

interface EclassOption {
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
    for_eclasses?: EclassOption[];
    enabled?: boolean;
    settings: Record<string, any>;
    id?: string;
}

// Dynamic schema generation based on form_fields
const createEnrichmentSchema = (
    form_fields: FormFields,
): Yup.ObjectSchema<FormData> => {
    const schemaFields = {
        for_eclasses: Yup.array(),
        enabled: Yup.boolean(),
        id: Yup.string(),
        settings: Yup.object().shape(
            Object.entries(form_fields || {}).reduce(
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
            ),
        ),
    };

    return Yup.object().shape(schemaFields);
};

/**
 * EnrichmentSettingsForm component
 *
 * @param {Object} props
 * @param {string} props.enrichment_class - The enrichment class to fetch settings for
 */
export default function EnrichmentSettingsForm({
    enrichment_class,
}: EnrichmentSettingsFormProps) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { intelioApi, entriesApi } = useApi();
    const [displayName, setDisplayName] = useState('');
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [formFields, setFormFields] = useState<FormFields>({});
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
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            for_eclasses: [],
            enabled: false,
            settings: {},
        },
    });

    // Fetch all entry classes for the for_eclasses selector
    const fetchEntryClasses = async (q: string): Promise<EclassOption[]> => {
        try {
            const response = await entriesApi.entryClassesList({});
            if (response) {
                return response
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
            intelioApi
                .enrichmentSettingsRetrieve({ enricherType: enrichment_class })
                .then((settings) => {
                    if (settings) {
                        setDisplayName(settings.displayName || '');

                        // Set form fields for validation schema
                        setFormFields(settings.formFields || {});

                        // Update validation schema based on form_fields
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
                    displayError(setAlert, navigate)(err);
                    setLoading(false);
                });
        }
    }, [enrichment_class, reset, navigate, intelioApi]);

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
                                    {errors.settings[key]?.message?.toString() || ''}
                                </p>
                            )}
                        </div>
                    </div>
                );
            } else if (field.type === 'number') {
                return (
                    <>
                        <div className='mt-4' key={`${key}-spacer`} />
                        <FormFieldComponent
                            key={key}
                            type='number'
                            label={capitalizeString(key)}
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register(`settings.${key}`)}
                            error={errors.settings?.[key]?.message?.toString() || ''}
                        />
                    </>
                );
            } else {
                // Default to string input
                return (
                    <>
                        <div className='mt-4' key={`${key}-spacer`} />
                        <FormFieldComponent
                            key={key}
                            type='text'
                            label={capitalizeString(key)}
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register(`settings.${key}`)}
                            error={errors.settings?.[key]?.message?.toString() || ''}
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
                        <Tabs tabClass={TabClasses.PILL}>
                            <Tab title='General' classes='space-y-4'>
                                <div className='mt-4' />

                                <FormFieldComponent
                                    type='checkbox'
                                    label='Enabled'
                                    className='switch switch-ghost-primary'
                                    {...register('enabled')}
                                    row={true}
                                    error={errors.enabled}
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
