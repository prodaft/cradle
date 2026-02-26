import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupInput,
    InputGroupTextarea,
} from '@/components/ui/input-group';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SelectOption } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

type Entity = components['schemas']['Entity'];

interface AddEntityFormProps {
    onAdd?: (result: Entity) => void;
}

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
    prefix?: string;
}

const entitySchema = z.object({
    name: z.string().min(1, { error: 'Name is required' }),
    subtype: z
        .object({
            value: z.string().min(1),
            label: z.string().min(1),
        })
        .nullable()
        .refine((val) => val !== null, {
            error: 'Subtype is required',
        }),
    description: z.string().default(''),
    isPublic: z.boolean().default(false),
    aliases: z
        .array(
            z.object({
                value: z.number(),
                label: z.string().min(1),
            }),
        )
        .default([]),
});

type AddEntityFormData = z.infer<typeof entitySchema>;

export default function AddEntityForm({ onAdd }: AddEntityFormProps) {
    const [subtypeOptions, setSubtypeOptions] = useState<SubtypeOption[]>([]);

    const {
        handleSubmit: handleFormSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<AddEntityFormData>({
        resolver: zodResolver(entitySchema) as any,
        defaultValues: {
            name: '',
            subtype: null as any,
            description: '',
            isPublic: false,
            aliases: [],
        },
    });

    const fetchAliasesMutation = useMutation({
        mutationFn: async (q: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/query/advanced/',
                {
                    params: {
                        query: {
                            query: q,
                            wildcard: true,
                        } as any,
                    },
                },
            );
            if (error) throw { response };
            return ((data as any).results ?? []).map((alias: any) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const { data: entryClassesData } = $api.useQuery(
        'get',
        '/entries/entry_classes/',
        { params: { query: { show_count: true } } },
        {
            refetchOnWindowFocus: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const hasSetDefaultSubtype = useRef(false);
    const nextNameRequestId = useRef(0);

    const handleSubtypeChange = useCallback(
        async (subtype: SubtypeOption | null) => {
            if (!subtype) return;

            const requestId = ++nextNameRequestId.current;
            const namePrefix = subtype.prefix || `${subtype.value}-`;

            setValue('subtype', subtype, { shouldValidate: true });
            setValue('name', `${namePrefix}...`, { shouldDirty: true });

            try {
                const { data: result, error } = await fetchClient.GET(
                    '/entries/next_name/{class_subtype}/',
                    { params: { path: { class_subtype: subtype.value } } },
                );

                if (nextNameRequestId.current !== requestId) return;
                if (error) throw error;

                setValue('name', result.name || `${namePrefix}1`, {
                    shouldDirty: true,
                });
            } catch (_error) {
                if (nextNameRequestId.current !== requestId) return;
                setValue('name', namePrefix, { shouldDirty: true });
            }
        },
        [setValue],
    );

    useEffect(() => {
        if (entryClassesData == null || hasSetDefaultSubtype.current) return;
        const results = entryClassesData.results ?? [];
        const entityClasses = results.filter((entity) => entity.type === 'entity');
        const options = entityClasses.map((c) => ({
            value: c.subtype,
            label: c.subtype,
            prefix: c.prefix || '',
        }));
        setSubtypeOptions(options);
        if (options.length > 0) {
            hasSetDefaultSubtype.current = true;
            handleSubtypeChange(options[0]);
        }
    }, [entryClassesData, handleSubtypeChange]);

    const createEntityMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { data, error, response } = await fetchClient.POST(
                '/entries/entities/',
                { body: payload },
            );
            if (error) throw { response };
            return data;
        },
        meta: {
            successMessage: 'Entity created successfully!',
        },
        onSuccess: (result) => {
            onAdd?.(result);
        },
    });

    const onSubmit = async (data: AddEntityFormData) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype?.value || '',
            is_public: data.isPublic,
            aliases: data.aliases.map((alias) => alias.value),
        };
        await createEntityMutation.mutateAsync(payload);
    };

    return (
        <form onSubmit={handleFormSubmit(onSubmit as any)} className='w-full'>
            <FieldGroup className='gap-4'>
                <Controller
                    name='name'
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                                <FieldLabel htmlFor={field.name}>
                                    Name
                                    <span className='text-destructive ml-1'>*</span>
                                </FieldLabel>
                                <InputGroup>
                                    <InputGroupInput
                                        {...field}
                                        id={field.name}
                                        placeholder='Name'
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                </InputGroup>
                                <FieldDescription>
                                    Unique identifier for this entity
                                </FieldDescription>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </FieldContent>
                        </Field>
                    )}
                />

                <Controller
                    name='subtype'
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                                <FieldLabel htmlFor={field.name}>
                                    Subtype
                                    <span className='text-destructive ml-1'>*</span>
                                </FieldLabel>
                                <Select
                                    value={field.value?.value || ''}
                                    onValueChange={(value) => {
                                        const option = subtypeOptions.find(
                                            (opt) => opt.value === value,
                                        );
                                        if (option) {
                                            field.onChange(option);
                                            handleSubtypeChange(option);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        className='w-full'
                                        aria-invalid={fieldState.invalid}
                                    >
                                        <SelectValue placeholder='Select subtype' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subtypeOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>Entity class type</FieldDescription>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </FieldContent>
                        </Field>
                    )}
                />

                <Field orientation='horizontal' data-invalid={Boolean(errors.isPublic)}>
                    <FieldContent>
                        <FieldLabel htmlFor='isPublic'>Publicly Available</FieldLabel>
                        <FieldDescription>
                            Allow public access to this entity
                        </FieldDescription>
                        {errors.isPublic && (
                            <FieldError>{errors.isPublic.message}</FieldError>
                        )}
                    </FieldContent>
                    <Controller
                        name='isPublic'
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id='isPublic'
                                name={field.name}
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='self-center'
                            />
                        )}
                    />
                </Field>

                <Controller
                    name='description'
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                                <FieldLabel htmlFor={field.name}>
                                    Description
                                </FieldLabel>
                                <InputGroup>
                                    <InputGroupTextarea
                                        {...field}
                                        id={field.name}
                                        placeholder='Description'
                                        rows={4}
                                        aria-invalid={fieldState.invalid}
                                    />
                                </InputGroup>
                                <FieldDescription>
                                    Brief explanation of this entity
                                </FieldDescription>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </FieldContent>
                        </Field>
                    )}
                />

                <Controller
                    name='aliases'
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldContent>
                                <FieldLabel htmlFor={field.name}>Aliases</FieldLabel>
                                <MultipleSelector
                                    value={
                                        (field.value?.map((a) => ({
                                            value: String(a.value),
                                            label: a.label,
                                        })) || []) as Option[]
                                    }
                                    defaultOptions={[]}
                                    placeholder='Select aliases...'
                                    onSearch={async (query) => {
                                        const results = await fetchAliasesMutation
                                            .mutateAsync(query)
                                            .catch((_error) => []);
                                        return results.map((a) => ({
                                            value: String(a.value),
                                            label: a.label,
                                        })) as unknown as Option[];
                                    }}
                                    onChange={(options) => {
                                        field.onChange(
                                            options.map((o) => ({
                                                value: Number(o.value),
                                                label: o.label,
                                            })),
                                        );
                                    }}
                                    emptyIndicator={
                                        <p className='text-center text-sm'>
                                            No aliases found
                                        </p>
                                    }
                                />
                                <FieldDescription>
                                    Alternate names or references for this entity
                                </FieldDescription>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </FieldContent>
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className='flex justify-end mt-5'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Entity'}
                </Button>
            </div>
        </form>
    );
}
