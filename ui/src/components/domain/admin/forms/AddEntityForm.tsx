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
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Entity } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SelectOption } from '../../../forms';

interface AddEntityFormProps {
    onAdd?: (result: Entity) => void;
}

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface AliasOption extends SelectOption<number> {
    value: number;
    label: string;
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
    const { entriesApi, queryApi } = useApi();

    const [subtypeOptions, setSubtypeOptions] = useState<SubtypeOption[]>([]);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
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
            const results = await queryApi.queryAdvancedRetrieve({
                query: [q],
                wildcard: true,
            });
            return results.results.map((alias) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    // Fetch aliases for async select
    const fetchAliases = async (q: string): Promise<AliasOption[]> => {
        try {
            return await fetchAliasesMutation.mutateAsync(q);
        } catch (error) {
            return [];
        }
    };

    const { data: entryClassesData } = useQuery({
        queryKey: queryKeys.entryTypes.lists(),
        queryFn: () => entriesApi.entryClassesList({ showCount: true }),
        refetchOnWindowFocus: false,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const hasSetDefaultSubtype = useRef(false);

    useEffect(() => {
        if (!entryClassesData || hasSetDefaultSubtype.current) return;
        const entityClasses = entryClassesData.filter(
            (entity) => entity.type === 'entity',
        );
        const options = entityClasses.map((c) => ({
            value: c.subtype,
            label: c.subtype,
        }));
        setSubtypeOptions(options);
        if (options.length > 0) {
            hasSetDefaultSubtype.current = true;
            reset((prev) => ({ ...prev, subtype: options[0] }));
            handleSubtypeChange(options[0]);
        }
    }, [entryClassesData, reset]);

    // Auto-fill name when subtype changes
    const handleSubtypeChange = async (subtype: SubtypeOption | null) => {
        if (!subtype) return;

        const currentName = watch('name' as any);
        if (
            !currentName ||
            (typeof currentName === 'string' && currentName.trim() === '')
        ) {
            // Auto-generate name based on subtype
            reset((prev: any) => ({
                ...prev,
                name: `${subtype.value}_1`,
            }));
        }
    };

    const createEntityMutation = useMutation({
        mutationFn: async (payload: any) => {
            return await entriesApi.entitiesCreate({
                entityRequest: payload,
            });
        },
        meta: {
            successMessage: 'Entity created successfully!',
            errorMessage: 'Failed to create entity',
        },
        onSuccess: (result) => {
            if (onAdd) onAdd(result);
        },
        onError: () => {
            toast.error('Failed to create entity');
        },
    });

    // Handle form submission
    const onSubmit = async (data: AddEntityFormData) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype?.value || '',
            is_public: data.isPublic,
            aliases: data.aliases.map((alias) => alias.value),
        };
        createEntityMutation.mutate(payload);
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

                <Field orientation='responsive' data-invalid={Boolean(errors.isPublic)}>
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
                                className='self-start md:self-center'
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
                                        const results = await fetchAliases(query);
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
