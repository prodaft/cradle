import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useNdjsonQuery } from '@/hooks/query';
import { SelectOption } from '@/types/models';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

type Entity = components['schemas']['Entity'];
type EntityRequest = components['schemas']['EntityRequest'];
type AdvancedQueryResponse = components['schemas']['AdvancedQueryPaginatedResponse'];

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
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<AddEntityFormData>({
        resolver: zodResolver(entitySchema) as any,
        defaultValues: {
            name: '',
            subtype: null as unknown as AddEntityFormData['subtype'],
            description: '',
            isPublic: false,
            aliases: [],
        },
    });

    const fetchAliases = useMutation({
        mutationFn: async (searchTerm: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/query/advanced/',
                {
                    params: {
                        query: {
                            query: [searchTerm],
                            wildcard: true,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            const results = (data as AdvancedQueryResponse)?.results ?? [];
            return results
                .filter(
                    (alias): alias is typeof alias & { id: number } =>
                        alias.id !== undefined,
                )
                .map((alias) => ({
                    value: alias.id,
                    label: `${alias.subtype}:${alias.name}`,
                }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const { data: entryClasses } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        params: {
            query: { show_count: true },
        },
        queryKey: ['entry_classes', 'add-entity', 'show_count'],
        refetchOnWindowFocus: false,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const subtypeDefaultedRef = useRef(false);
    const nextNameRequestId = useRef(0);

    const selectSubtype = useCallback(
        async (subtype: SubtypeOption | null) => {
            if (!subtype) return;

            const requestId = ++nextNameRequestId.current;
            const namePrefix = subtype.prefix || `${subtype.value}-`;

            setValue('subtype', subtype, { shouldValidate: true });
            setValue('name', `${namePrefix}...`, { shouldDirty: true });

            try {
                const { data: result, error } = await fetchClient.GET(
                    '/entries/next-name/{class_subtype}/',
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
        if (entryClasses == null || subtypeDefaultedRef.current) return;
        const results = entryClasses;
        const entityClasses = results.filter((entity) => entity.type === 'entity');
        const options = entityClasses.map((c) => ({
            value: c.subtype,
            label: c.subtype,
            prefix: (c.prefix as string) || '',
        }));
        setSubtypeOptions(options);
        if (options.length > 0) {
            subtypeDefaultedRef.current = true;
            const first = options[0];
            if (first) {
                selectSubtype(first);
            }
        }
    }, [entryClasses, selectSubtype]);

    const createEntity = useMutation({
        mutationFn: async (payload: EntityRequest) => {
            const { data, error, response } = await fetchClient.POST(
                '/entries/entities/',
                { body: payload },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (result) => {
            onAdd?.(result);
        },
    });

    const onSubmit = async (values: AddEntityFormData) => {
        const payload = {
            type: 'entity',
            name: values.name,
            description: values.description,
            subtype: values.subtype?.value || '',
            is_public: values.isPublic,
            aliases: values.aliases.map((alias) => alias.value),
        };
        await createEntity.mutateAsync(payload);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className='flex w-full min-h-0 flex-col gap-4'
        >
            <div className='-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4'>
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
                                                selectSubtype(option);
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
                                    <FieldDescription>
                                        Entity class type
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Field
                        orientation='horizontal'
                        data-invalid={Boolean(errors.isPublic)}
                    >
                        <FieldContent>
                            <FieldLabel htmlFor='isPublic'>
                                Publicly Available
                            </FieldLabel>
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
                                    <FieldLabel htmlFor={field.name}>
                                        Aliases
                                    </FieldLabel>
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
                                            const results = await fetchAliases
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
            </div>

            <DialogFooter className='shrink-0 sm:justify-end'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Spinner className='size-4' />
                            Creating...
                        </>
                    ) : (
                        'Create Entity'
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}
