import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startCase } from 'lodash';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SelectOption } from '../../../forms';

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
    });
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
            suppressNotification: true,
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
            toast.error('Failed to load enrichment settings');
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
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({ field: controllerField, fieldState }) => (
                                <Field
                                    orientation='horizontal'
                                    className='py-2'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                            {startCase(key)}
                                            {field.required && (
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            )}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription className='text-sm'>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <Switch
                                        id={`settings.${key}`}
                                        name={controllerField.name}
                                        checked={controllerField.value ?? false}
                                        onCheckedChange={controllerField.onChange}
                                        className='self-center'
                                        aria-invalid={fieldState.invalid}
                                        aria-describedby={
                                            fieldState.invalid
                                                ? `settings.${key}-error`
                                                : undefined
                                        }
                                    />
                                </Field>
                            )}
                        />
                    ) : field.type === 'choice' ? (
                        <Controller
                            control={control}
                            name={`settings.${key}`}
                            render={({ field: controllerField, fieldState }) => {
                                const options = field.options || [];
                                const stringValue =
                                    (typeof controllerField.value === 'string'
                                        ? controllerField.value
                                        : '') ?? '';
                                return (
                                    <Field
                                        orientation='horizontal'
                                        className='py-2'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                {startCase(key)}
                                                {field.required && (
                                                    <span className='text-destructive ml-1'>
                                                        *
                                                    </span>
                                                )}
                                            </FieldLabel>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-72'>
                                            <Select
                                                value={stringValue}
                                                onValueChange={controllerField.onChange}
                                            >
                                                <SelectTrigger
                                                    className='self-center'
                                                    aria-invalid={fieldState.invalid}
                                                    aria-describedby={
                                                        fieldState.invalid
                                                            ? `settings.${key}-error`
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue
                                                        placeholder={`Select ${startCase(key)}...`}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {options.map((opt) => (
                                                        <SelectItem
                                                            key={opt}
                                                            value={opt}
                                                        >
                                                            {opt}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </Field>
                                );
                            }}
                        />
                    ) : field.type === 'url' ? (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({ field: controllerField, fieldState }) => (
                                <Field
                                    orientation='horizontal'
                                    className='py-2'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor={`settings.${key}`}
                                            className='text-sm text-muted-foreground block mb-0.5'
                                        >
                                            {startCase(key)}
                                            {field.required && (
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            )}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription className='text-sm'>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <Input
                                        {...controllerField}
                                        id={`settings.${key}`}
                                        type='url'
                                        className='w-64'
                                        value={(controllerField.value as string) ?? ''}
                                        onChange={(e) =>
                                            controllerField.onChange(e.target.value)
                                        }
                                        aria-invalid={fieldState.invalid}
                                        aria-describedby={
                                            fieldState.invalid
                                                ? `settings.${key}-error`
                                                : undefined
                                        }
                                    />
                                </Field>
                            )}
                        />
                    ) : (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({ field: controllerField, fieldState }) => (
                                <Field
                                    orientation='horizontal'
                                    className='py-2'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor={`settings.${key}`}
                                            className='text-sm text-muted-foreground block mb-0.5'
                                        >
                                            {startCase(key)}
                                            {field.required && (
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            )}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription className='text-sm'>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </FieldContent>
                                    <Input
                                        {...controllerField}
                                        id={`settings.${key}`}
                                        type={
                                            field.type === 'number' ? 'number' : 'text'
                                        }
                                        className='w-64 self-center'
                                        value={
                                            (controllerField.value as
                                                | string
                                                | number) ?? ''
                                        }
                                        onChange={(e) =>
                                            controllerField.onChange(e.target.value)
                                        }
                                        aria-invalid={fieldState.invalid}
                                        aria-describedby={
                                            fieldState.invalid
                                                ? `settings.${key}-error`
                                                : undefined
                                        }
                                    />
                                </Field>
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
            <div className='flex items-center justify-center min-h-screen animate-pulse text-foreground'>
                Loading enrichment settings...
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='px-4 py-4'>
                <h2 className='text-2xl font-bold tracking-tight'>
                    {displayName} Settings
                </h2>
                <p className='text-muted-foreground'>
                    Manage configuration for {displayName}
                </p>
            </div>

            {/* Content Area */}
            <div className='px-4 pb-4'>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    {/* General Section */}
                    <section id='general'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            General Information
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Core configuration for this enrichment
                        </p>

                        <Card className='border-border bg-muted/5 space-y-0'>
                            <CardContent className='px-4 py-1'>
                                <Controller
                                    name='enabled'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='horizontal'
                                            className='py-2'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='enabled'
                                                    className='text-sm text-muted-foreground block mb-0.5'
                                                >
                                                    Enabled
                                                </FieldLabel>
                                                <FieldDescription className='text-sm'>
                                                    Enable or disable this enrichment
                                                    source
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <Switch
                                                id='enabled'
                                                name={field.name}
                                                checked={field.value ?? false}
                                                onCheckedChange={field.onChange}
                                                className='self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'enabled-error'
                                                        : undefined
                                                }
                                            />
                                        </Field>
                                    )}
                                />

                                <Separator />

                                <Controller
                                    name='for_eclasses'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='horizontal'
                                            className='py-2'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                    Entry Classes
                                                </FieldLabel>
                                                <FieldDescription className='text-sm'>
                                                    Entry classes to apply this
                                                    enrichment to
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError className='text-sm mt-1'>
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <div className='w-64 self-center'>
                                                <MultipleSelector
                                                    value={
                                                        (field.value?.map((e) => ({
                                                            value: e.value,
                                                            label: e.label,
                                                        })) || []) as Option[]
                                                    }
                                                    defaultOptions={[]}
                                                    placeholder='Select entry classes...'
                                                    triggerSearchOnFocus
                                                    onSearch={async (query) => {
                                                        const results =
                                                            await fetchEntryClasses(
                                                                query,
                                                            );
                                                        return results.map((e) => ({
                                                            value: e.value,
                                                            label: e.label,
                                                        })) as unknown as Option[];
                                                    }}
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
                                                            No entry classes found
                                                        </p>
                                                    }
                                                />
                                            </div>
                                        </Field>
                                    )}
                                />
                            </CardContent>
                        </Card>
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

                            <Card className='border-border bg-muted/5 space-y-0'>
                                <CardContent className='px-4 py-1'>
                                    {renderSettingsFields()}
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Save Button */}
                    <div className='pt-2 flex justify-end'>
                        <Button type='submit' variant='default' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
