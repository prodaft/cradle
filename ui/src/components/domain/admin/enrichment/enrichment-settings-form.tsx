import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
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
import { SelectOption } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchClient } from '@services/openapi/client';
import { fetchAllEntryClasses } from '@services/openapi/fetch-all-pages';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startCase } from 'lodash';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

interface EnrichmentSettingsFormProps {
    enrichment_class: string;
}

type EclassOption = SelectOption<string>;

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
            let validator: z.ZodTypeAny = z.string();

            if (field.type === 'number') {
                validator = z.coerce.number();
            } else if (field.type === 'boolean') {
                validator = z.boolean();
            } else if (field.type === 'url') {
                const urlValidator = z
                    .string()
                    .check(z.url({ error: `${key} must be a valid URL` }));
                validator = field.required
                    ? urlValidator
                    : z.union([z.literal(''), urlValidator]);
            }

            if (field.required) {
                // Only apply .min() to string/number types, not boolean
                if (
                    field.type === 'string' ||
                    field.type === 'choice' ||
                    field.type === 'url'
                ) {
                    validator = (validator as z.ZodString).min(1, {
                        message: `${key} is required`,
                    });
                } else if (field.type === 'number') {
                    validator = (validator as z.ZodNumber).min(0, {
                        message: `${key} is required`,
                    });
                }
            }

            acc[key] = validator;
            return acc;
        },
        {} as Record<string, z.ZodTypeAny>,
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
    const fetchEntryClassesMutation = useMutation({
        mutationFn: async (q: string) => {
            const results = await fetchAllEntryClasses({
                search: q || undefined,
            });
            return results.map((entry) => ({
                value: entry.subtype,
                label: entry.subtype,
            }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const updateEnrichmentSettingsMutation = useMutation({
        mutationFn: async (formatted_data: any) => {
            const { error, response } = await fetchClient.POST(
                '/intelio/enrichment/{enricher_type}/',
                {
                    params: { path: { enricher_type: enrichment_class } },
                    body: formatted_data,
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Enrichment settings saved successfully',
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
        formState: { isSubmitting },
    } = form;

    // Fetch all entry classes for the for_eclasses selector
    const fetchEntryClasses = async (q: string): Promise<EclassOption[]> => {
        try {
            return await fetchEntryClassesMutation.mutateAsync(q);
        } catch (_err) {
            return [];
        }
    };

    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['enrichment', 'settings', enrichment_class],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrichment/{enricher_type}/',
                {
                    params: { path: { enricher_type: enrichment_class } },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!enrichment_class,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    useEffect(() => {
        if (settingsData) {
            const sd = settingsData as any;
            const formFields = sd.form_fields ?? sd.formFields ?? {};
            setValidationSchema(createEnrichmentSchema(formFields));

            const initialSettings: Record<string, string | number | boolean> = {};
            Object.entries(formFields).forEach(([key, field]: [string, any]) => {
                if (field.type === 'boolean') {
                    initialSettings[key] = sd.settings?.[key] ?? false;
                } else {
                    initialSettings[key] = sd.settings?.[key] ?? '';
                }
            });

            const eclassesDetail = sd.for_eclasses_detail ?? sd.forEclassesDetail ?? [];
            const formattedEclasses = eclassesDetail.map((eclass: any) => ({
                value: eclass.subtype,
                label: eclass.subtype,
            }));

            reset({
                for_eclasses: formattedEclasses,
                enabled: sd.enabled || false,
                settings: initialSettings,
                id: sd.id,
            });
        }
    }, [settingsData, reset]);

    // Handle errors
    useEffect(() => {
        if (settingsData === undefined && !isLoading && enrichment_class) {
            toast.error('Failed to load enrichment settings');
        }
    }, [settingsData, isLoading, enrichment_class]);

    const sd = settingsData as any;
    const displayName = sd?.display_name ?? sd?.displayName ?? '';
    const formFields = sd?.form_fields ?? sd?.formFields ?? {};

    const onSubmit = async (
        data: z.infer<ReturnType<typeof createEnrichmentSchema>>,
    ) => {
        const { for_eclasses, ...rest } = data;
        const formatted_data = {
            ...rest,
            for_eclasses: for_eclasses?.map((item) => item.value),
        };
        await updateEnrichmentSettingsMutation.mutateAsync(formatted_data);
    };

    // Render form fields (docs: Field orientation="responsive" with FieldContent)
    const renderSettingsFields = () => {
        const entries = Object.entries(formFields) as [string, FormField][];
        return entries.map(([key, field], index) => {
            const label = (
                <>
                    {startCase(key)}
                    {field.required && <span className='text-destructive ml-1'>*</span>}
                </>
            );

            const content = (
                <div>
                    {field.type === 'boolean' ? (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({ field: controllerField, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel htmlFor={`settings.${key}`}>
                                            {label}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                    </FieldContent>
                                    <Switch
                                        id={`settings.${key}`}
                                        name={controllerField.name}
                                        checked={controllerField.value ?? false}
                                        onCheckedChange={controllerField.onChange}
                                        className='self-start md:self-center'
                                        aria-invalid={fieldState.invalid}
                                        aria-describedby={
                                            fieldState.invalid
                                                ? `settings.${key}-error`
                                                : undefined
                                        }
                                    />
                                    {fieldState.invalid && (
                                        <FieldError className='text-sm mt-1'>
                                            {fieldState.error?.message}
                                        </FieldError>
                                    )}
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
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent>
                                            <FieldLabel htmlFor={`settings.${key}`}>
                                                {label}
                                            </FieldLabel>
                                            {field.description && (
                                                <FieldDescription>
                                                    {field.description}
                                                </FieldDescription>
                                            )}
                                        </FieldContent>
                                        <div className='w-72 shrink-0 self-start md:self-center'>
                                            <Select
                                                value={stringValue}
                                                onValueChange={controllerField.onChange}
                                            >
                                                <SelectTrigger
                                                    id={`settings.${key}`}
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
                                        {fieldState.invalid && (
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
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
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel htmlFor={`settings.${key}`}>
                                            {label}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                    </FieldContent>
                                    <Input
                                        {...controllerField}
                                        id={`settings.${key}`}
                                        type='url'
                                        className='w-64 shrink-0 self-start md:self-center'
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
                                    {fieldState.invalid && (
                                        <FieldError className='text-sm mt-1'>
                                            {fieldState.error?.message}
                                        </FieldError>
                                    )}
                                </Field>
                            )}
                        />
                    ) : (
                        <Controller
                            control={control}
                            name={`settings.${key}` as any}
                            render={({ field: controllerField, fieldState }) => (
                                <Field
                                    orientation='responsive'
                                    data-invalid={fieldState.invalid}
                                >
                                    <FieldContent>
                                        <FieldLabel htmlFor={`settings.${key}`}>
                                            {label}
                                        </FieldLabel>
                                        {field.description && (
                                            <FieldDescription>
                                                {field.description}
                                            </FieldDescription>
                                        )}
                                    </FieldContent>
                                    <Input
                                        {...controllerField}
                                        id={`settings.${key}`}
                                        type={
                                            field.type === 'number' ? 'number' : 'text'
                                        }
                                        className='w-64 shrink-0 self-start md:self-center'
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
                                    {fieldState.invalid && (
                                        <FieldError className='text-sm mt-1'>
                                            {fieldState.error?.message}
                                        </FieldError>
                                    )}
                                </Field>
                            )}
                        />
                    )}
                </div>
            );
            return (
                <div key={key} className='space-y-4'>
                    {content}
                    {index < entries.length - 1 && (
                        <Separator
                            data-orientation='horizontal'
                            role='none'
                            className='shrink-0'
                        />
                    )}
                </div>
            );
        });
    };

    if (isLoading) {
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
            <div className='px-4'>
                <Separator
                    data-orientation='horizontal'
                    role='none'
                    className='shrink-0 mt-2 mb-4 lg:mb-6'
                />
            </div>

            {/* Content Area */}
            <div className='px-4 pb-4'>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className='flex flex-col gap-6'>
                        {/* General Information */}
                        <FieldSet id='general' className='gap-4'>
                            <div className='space-y-4'>
                                <FieldLegend className='mb-0'>
                                    General Information
                                </FieldLegend>
                                <Separator className='mt-4' />
                            </div>
                            <FieldGroup className='gap-4'>
                                <Controller
                                    name='enabled'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent>
                                                <FieldLabel htmlFor='enabled'>
                                                    Enabled
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Enable or disable this enrichment
                                                    source
                                                </FieldDescription>
                                            </FieldContent>
                                            <Switch
                                                id='enabled'
                                                name={field.name}
                                                checked={field.value ?? false}
                                                onCheckedChange={field.onChange}
                                                className='self-start md:self-center'
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'enabled-error'
                                                        : undefined
                                                }
                                            />
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </Field>
                                    )}
                                />

                                <Separator />

                                <Controller
                                    name='for_eclasses'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent>
                                                <FieldLabel htmlFor='for_eclasses'>
                                                    Entry Classes
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Entry classes to apply this
                                                    enrichment to
                                                </FieldDescription>
                                            </FieldContent>
                                            <div className='w-64 shrink-0 self-start md:self-center'>
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
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </FieldSet>

                        {Object.keys(formFields).length > 0 && (
                            <FieldSet id='settings' className='gap-4'>
                                <div className='space-y-4'>
                                    <FieldLegend className='mb-0'>
                                        Enrichment Parameters
                                    </FieldLegend>
                                    <Separator className='mt-4' />
                                </div>
                                <FieldGroup className='gap-4'>
                                    {renderSettingsFields()}
                                </FieldGroup>
                            </FieldSet>
                        )}
                    </div>

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
