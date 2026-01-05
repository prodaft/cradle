import useApi from '@/hooks/api/useApi';
import { capitalizeString } from '@/utils/dashboard';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
    FormAlert,
    FormAlertState,
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsSeparator,
    SettingsToggle,
} from '../../../forms';
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
    description?: string;
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

    const {
        handleSubmit,
        control,
        reset,
        register,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(validationSchema) as any,
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
                    .filter((x) => x.subtype.toLowerCase().startsWith(q.toLowerCase()))
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
        const entries = Object.entries(formFields);
        return entries.map(([key, field], index) => {
            const isLast = index === entries.length - 1;
            const content = (
                <div key={key}>
                    {field.type === 'choice' ? (
                        <SettingsField
                            label={capitalizeString(key)}
                            required={field.required}
                            error={errors.settings?.[key]?.message?.toString()}
                            inputWidth='w-72'
                        >
                            <Controller
                                control={control}
                                name={`settings.${key}`}
                                render={({ field: { onChange, value } }) => (
                                    <Selector
                                        value={
                                            field.options?.map(o => ({ label: o, value: o })).find(
                                                (o) => o.value === value,
                                            ) || null
                                        }
                                        onChange={(option: any) =>
                                            onChange(option?.value)
                                        }
                                        staticOptions={
                                            field.options?.map((option) => ({
                                                value: option,
                                                label: option,
                                            })) || []
                                        }
                                        placeholder={`Select ${capitalizeString(key)}...`}
                                    />
                                )}
                            />
                        </SettingsField>
                    ) : (
                        <SettingsField
                            label={capitalizeString(key)}
                            description={field.description}
                            type={field.type === 'number' ? 'number' : 'text'}
                            {...register(`settings.${key}`)}
                            error={errors.settings?.[key]?.message?.toString()}
                            required={field.required}
                        />
                    )}
                    {!isLast && <SettingsSeparator minimal={true} />}
                </div>
            );
            return content;
        });
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>
                    Loading enrichment settings...
                </div>
            </div>
        );
    }

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        {displayName} Settings
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Manage configuration for {displayName}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'> {/* Removed max-w-4xl here */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FormAlert
                            alert={alert}
                            onDismiss={() => setAlert({ type: null, message: '' })}
                        />

                        {/* General Section */}
                        <section id='general' className='pb-8'>
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                General Information
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                Core configuration for this enrichment
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsToggle
                                        label='Enabled'
                                        description='Enable or disable this enrichment source'
                                        {...register('enabled')}
                                        watch={watch}
                                    />

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'> {/* Added flex container */}
                                            <div className='flex-1'>
                                                <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                                    Entry Classes
                                                </label>
                                                <p className='text-sm cradle-text-muted'>
                                                    Entry classes to apply this enrichment to
                                                </p>
                                                {errors.for_eclasses && (
                                                    <p className='text-red-600 text-sm mt-1'>
                                                        {errors.for_eclasses.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='w-auto flex-1'> {/* Wrapped Selector in this div */}
                                                <Controller
                                                    name='for_eclasses'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Selector
                                                            {...field}
                                                            fetchOptions={fetchEntryClasses}
                                                            isMulti={true}
                                                            placeholder='Select entry classes...'
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Settings Section */}
                        {Object.keys(formFields).length > 0 && (
                            <section
                                id='settings'
                                className='border-t border-white/5 pt-5 pb-8'
                            >
                                <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                    Enrichment Parameters
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                                    Specific settings for the enrichment provider
                                </p>

                                <div className='space-y-4'>
                                    <SettingsCard>{renderSettingsFields()}</SettingsCard>
                                </div>
                            </section>
                        )}

                        {/* Save Button */}
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary px-6 rounded-lg'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}