import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import useApi from '@/hooks/api/useApi';
import { capitalizeString } from '@/utils/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, InfoCircle, WarningCircle } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsToggle,
} from '../../../forms';

interface EnrichmentSettingsFormProps {
    enrichment_class: string;
}

interface EclassOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FormField {
    type: 'string' | 'number' | 'choice' | 'boolean' | 'url';
    required?: boolean;
    options?: string[];
    description?: string;
}

interface FormFields {
    [key: string]: FormField;
}

// Dynamic schema generation based on form_fields
const createEnrichmentSchema = (form_fields: FormFields) => {
    const settingsShape = Object.entries(form_fields || {}).reduce(
        (acc, [key, field]) => {
            let validator: z.ZodType = z.string();

            if (field.type === 'number') {
                validator = z.coerce.number();
            } else if (field.type === 'choice') {
                validator = z.string();
            } else if (field.type === 'boolean') {
                validator = z.boolean();
            } else if (field.type === 'url') {
                validator = z.string().refine((val) => z.url().safeParse(val).success, {
                    error: `${key} must be a valid URL`,
                });
            }

            if (field.required) {
                // Only apply .min() to string/number types, not boolean
                if (
                    field.type === 'string' ||
                    field.type === 'choice' ||
                    field.type === 'url'
                ) {
                    validator = (validator as z.ZodString).min(1, {
                        error: `${key} is required`,
                    });
                } else if (field.type === 'number') {
                    validator = (validator as z.ZodNumber).min(0, {
                        error: `${key} is required`,
                    });
                }
            }

            acc[key] = validator;
            return acc;
        },
        {} as Record<string, z.ZodType>,
    );

    return z.object({
        for_eclasses: z
            .array(z.object({ value: z.string(), label: z.string() }))
            .default([]),
        enabled: z.boolean().default(false),
        id: z.string().optional(),
        settings: z.object(settingsShape),
    });
};

export default function EnrichmentSettingsForm({
    enrichment_class,
}: EnrichmentSettingsFormProps) {
    const { intelioApi, entriesApi } = useApi();

    const fetchEntryClassesMutation = useMutation({
        mutationFn: async (q: string) => {
            const response = await entriesApi.entryClassesList({});
            if (response) {
                return response
                    .filter((x) => x.subtype.toLowerCase().startsWith(q.toLowerCase()))
                    .map((entry) => ({
                        value: entry.subtype,
                        label: entry.subtype,
                    }));
            }
            return [];
        },
        meta: {
            suppressNotification: true,
        },
    });

    const updateEnrichmentSettingsMutation = useMutation({
        mutationFn: async (formatted_data: any) => {
            await intelioApi.enrichmentSettingsUpdate({
                enricherType: enrichment_class,
                enrichmentSettingsRequest: formatted_data,
            });
        },
        meta: {
            successMessage: 'Enrichment settings saved successfully',
            errorMessage: 'Failed to save enrichment settings',
        },
        onSuccess: () => {
            setAlert({
                type: 'success',
                message: 'Enrichment settings saved successfully',
            });
        },
        onError: () => {
            setAlert({
                type: 'error',
                message: 'Failed to save enrichment settings',
            });
        },
    });
    const [alert, setAlert] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({ type: null, message: '' });
    const [validationSchema, setValidationSchema] = useState(
        createEnrichmentSchema({}),
    );

    const form = useForm<z.infer<ReturnType<typeof createEnrichmentSchema>>>({
        resolver: zodResolver(validationSchema) as any,
        defaultValues: {
            for_eclasses: [],
            enabled: false,
            settings: {},
        },
    });

    const {
        control,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = form;

    // Fetch all entry classes for the for_eclasses selector
    const fetchEntryClasses = async (q: string): Promise<EclassOption[]> => {
        try {
            return await fetchEntryClassesMutation.mutateAsync(q);
        } catch (err) {
            return [];
        }
    };

    // Query for enrichment settings
    const { data: settingsData, isPending: loading } = useQuery({
        queryKey: ['enrichment', 'settings', enrichment_class],
        queryFn: () =>
            intelioApi.enrichmentSettingsRetrieve({
                enricherType: enrichment_class,
            }),
        enabled: !!enrichment_class,
        meta: {
            showErrorToast: false,
            suppressNotification: true, // We handle alerts ourselves
        },
    });

    // Update form when settings load
    useEffect(() => {
        if (settingsData) {
            setValidationSchema(createEnrichmentSchema(settingsData.formFields || {}));

            // Initialize settings object with defaults
            const initialSettings: Record<string, string | number | boolean> = {};
            Object.entries(settingsData.formFields || {}).forEach(([key, field]) => {
                if (field.type === 'boolean') {
                    initialSettings[key] = settingsData.settings?.[key] ?? false;
                } else if (field.type === 'number') {
                    initialSettings[key] = settingsData.settings?.[key] ?? '';
                } else {
                    initialSettings[key] = settingsData.settings?.[key] ?? '';
                }
            });

            // Format for_eclasses for the selector
            const formattedEclasses =
                settingsData.forEclassesDetail?.map((eclass) => ({
                    value: eclass.subtype,
                    label: eclass.subtype,
                })) || [];

            // Set form values
            reset({
                for_eclasses: formattedEclasses,
                enabled: settingsData.enabled || false,
                settings: initialSettings,
                id: settingsData.id,
            });
        }
    }, [settingsData, reset]);

    // Handle errors
    useEffect(() => {
        if (settingsData === undefined && !loading && enrichment_class) {
            setAlert({
                type: 'error',
                message: 'Failed to load enrichment settings',
            });
        }
    }, [settingsData, loading, enrichment_class]);

    const displayName = settingsData?.displayName || '';
    const formFields = settingsData?.formFields || {};

    const onSubmit = async (
        data: z.infer<ReturnType<typeof createEnrichmentSchema>>,
    ) => {
        const formatted_data = {
            ...data,
            forEclasses: data.for_eclasses?.map((item) => item.value),
        };
        updateEnrichmentSettingsMutation.mutate(formatted_data);
    };

    // Render form fields based on form_fields configuration
    const renderSettingsFields = () => {
        const entries = Object.entries(formFields);
        return entries.map(([key, field], index) => {
            const isLast = index === entries.length - 1;
            const content = (
                <div key={key}>
                    {field.type === 'boolean' ? (
                        <SettingsToggle
                            label={capitalizeString(key)}
                            description={field.description}
                            name={`settings.${key}`}
                            control={control}
                            error={errors.settings?.[key] as any}
                        />
                    ) : field.type === 'choice' ? (
                        <SettingsField
                            label={capitalizeString(key)}
                            required={field.required}
                            error={errors.settings?.[key]?.message?.toString()}
                            inputWidth='w-72'
                        >
                            <Controller
                                control={control}
                                name={`settings.${key}`}
                                render={({ field: { onChange, value } }) => {
                                    const options = field.options || [];
                                    const stringValue =
                                        (typeof value === 'string' ? value : '') ?? '';
                                    return (
                                        <Select
                                            value={stringValue}
                                            onValueChange={onChange}
                                        >
                                            <SelectTrigger
                                                className='w-72'
                                                aria-invalid={Boolean(
                                                    errors.settings?.[key],
                                                )}
                                            >
                                                <SelectValue
                                                    placeholder={`Select ${capitalizeString(key)}...`}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    );
                                }}
                            />
                        </SettingsField>
                    ) : field.type === 'url' ? (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({
                                field: { onChange, value, ...fieldProps },
                                fieldState,
                            }) => (
                                <SettingsField
                                    {...fieldProps}
                                    label={capitalizeString(key)}
                                    description={field.description}
                                    type='url'
                                    value={(value as string) ?? ''}
                                    onChange={(e) => onChange(e.target.value)}
                                    error={fieldState.error?.message?.toString()}
                                    required={field.required}
                                />
                            )}
                        />
                    ) : (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({
                                field: { onChange, value, ...fieldProps },
                                fieldState,
                            }) => (
                                <SettingsField
                                    {...fieldProps}
                                    label={capitalizeString(key)}
                                    description={field.description}
                                    type={field.type === 'number' ? 'number' : 'text'}
                                    value={(value as string | number) ?? ''}
                                    onChange={(e) => onChange(e.target.value)}
                                    error={fieldState.error?.message?.toString()}
                                    required={field.required}
                                />
                            )}
                        />
                    )}
                    {!isLast && <Separator className='my-2' />}
                </div>
            );
            return content;
        });
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>
                    Loading enrichment settings...
                </div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                        {displayName} Settings
                    </h2>
                    <p className='text-muted-foreground'>
                        Manage configuration for {displayName}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {' '}
                    {/* Removed max-w-4xl here */}
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        {alert.type && (
                            <Alert
                                variant={
                                    alert.type === 'error' ? 'destructive' : 'default'
                                }
                            >
                                {alert.type === 'success' && <CheckCircle />}
                                {alert.type === 'error' && <WarningCircle />}
                                {alert.type === 'warning' && <InfoCircle />}
                                <AlertDescription>{alert.message}</AlertDescription>
                            </Alert>
                        )}

                        {/* General Section */}
                        <section id='general' className='pb-8'>
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                General Information
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Core configuration for this enrichment
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label
                                                    htmlFor='enabled'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Enabled
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Enable or disable this enrichment
                                                    source
                                                </p>
                                            </div>
                                            <Controller
                                                name='enabled'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='enabled'
                                                        name={field.name}
                                                        checked={field.value ?? false}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            {' '}
                                            {/* Added flex container */}
                                            <div className='flex-1'>
                                                <Label className='text-sm text-muted-foreground block mb-0.5'>
                                                    Entry Classes
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>
                                                    Entry classes to apply this
                                                    enrichment to
                                                </p>
                                                {errors.for_eclasses && (
                                                    <p className='text-destructive text-sm mt-1'>
                                                        {errors.for_eclasses.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className='w-auto flex-1'>
                                                {' '}
                                                {/* Wrapped Selector in this div */}
                                                <Controller
                                                    name='for_eclasses'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <MultipleSelector
                                                            value={
                                                                (field.value?.map(
                                                                    (e) => ({
                                                                        value: e.value,
                                                                        label: e.label,
                                                                    }),
                                                                ) || []) as Option[]
                                                            }
                                                            defaultOptions={[]}
                                                            placeholder='Select entry classes...'
                                                            onSearch={async (query) => {
                                                                const results =
                                                                    await fetchEntryClasses(
                                                                        query,
                                                                    );
                                                                return results.map(
                                                                    (e) => ({
                                                                        value: e.value,
                                                                        label: e.label,
                                                                    }),
                                                                ) as unknown as Option[];
                                                            }}
                                                            onChange={(options) => {
                                                                field.onChange(
                                                                    options.map(
                                                                        (o) => ({
                                                                            value: o.value,
                                                                            label: o.label,
                                                                        }),
                                                                    ),
                                                                );
                                                            }}
                                                            emptyIndicator={
                                                                <p className='text-center text-sm'>
                                                                    No entry classes
                                                                    found
                                                                </p>
                                                            }
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
                                <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                    Enrichment Parameters
                                </h2>
                                <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                    Specific settings for the enrichment provider
                                </p>

                                <div className='space-y-4'>
                                    <SettingsCard>
                                        {renderSettingsFields()}
                                    </SettingsCard>
                                </div>
                            </section>
                        )}

                        {/* Save Button */}
                        <div className='pt-2 flex justify-end'>
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
