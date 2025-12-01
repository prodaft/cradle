import useApi from '@/hooks/api/useApi';
import { AccessUser, Entity } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import {
    Form,
    FormInput,
    FormSelect,
    FormSwitch,
    FormTextArea,
    SelectOption,
} from '../../../forms';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';
import AdminPanelPermissionCard from '../cards/AdminPanelPermissionCard';

interface EntityFormProps {
    id?: number | string | null;
    isEdit?: boolean;
    onAdd?: (result: Entity) => void;
}

interface AliasOption extends SelectOption<number> {
    value: number;
    label: string;
}

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface FormData {
    name: string;
    subtype: SubtypeOption | null;
    description: string;
    isPublic: boolean;
    aliases: AliasOption[];
}

const entitySchema: Yup.ObjectSchema<FormData> = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    subtype: Yup.object()
        .shape({
            value: Yup.string().required(),
            label: Yup.string().required(),
        })
        .nullable()
        .required('Subtype is required'),
    description: Yup.string().default(''),
    isPublic: Yup.boolean().default(false),
    aliases: Yup.array()
        .of(
            Yup.object().shape({
                value: Yup.number().required(),
                label: Yup.string().required(),
            }),
        )
        .default([]),
}) as Yup.ObjectSchema<FormData>;

export default function EntityForm({
    id = null,
    isEdit = false,
    onAdd,
}: EntityFormProps) {
    const { accessApi, entriesApi, queryApi } = useApi();

    const [accesses, setAccessUsers] = useState<AccessUser[]>([]);
    const [entity, setEntity] = useState<Entity | null>(null);
    const [subtypeOptions, setSubtypeOptions] = useState<SubtypeOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [initialData, setInitialData] = useState<FormData>({
        name: '',
        subtype: null,
        description: '',
        isPublic: false,
        aliases: [],
    });

    // Fetch aliases for async select
    const fetchAliases = async (q: string): Promise<AliasOption[]> => {
        try {
            const results = await queryApi.queryAdvancedRetrieve({
                query: [q],
                wildcard: true,
            });

            return results.results.map((alias) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
        } catch (error) {
            console.error('Failed to fetch aliases:', error);
            return [];
        }
    };

    // Fetch subtype options on mount
    useEffect(() => {
        (async () => {
            try {
                const entryClasses = await entriesApi.entryClassesList({
                    showCount: true,
                });
                const entityClasses = entryClasses.filter(
                    (entity) => entity.type === 'entity',
                );
                const options = entityClasses.map((c) => ({
                    value: c.subtype,
                    label: c.subtype,
                }));
                setSubtypeOptions(options);

                // Set default subtype for new entities
                if (!isEdit && options.length > 0) {
                    setInitialData((prev) => ({ ...prev, subtype: options[0] }));
                }
            } catch (err) {
                console.error('Failed to fetch subtypes:', err);
            }
        })();
    }, [isEdit, entriesApi]);

    // Fetch entity data when editing
    useEffect(() => {
        (async () => {
            if (isEdit && id) {
                setIsLoading(true);
                try {
                    const [entityData, accessData] = await Promise.all([
                        entriesApi.entitiesRetrieve({ entityId: Number(id) }),
                        accessApi.accessEntityList({ entityId: Number(id) }),
                    ]);

                    setInitialData({
                        name: entityData.name,
                        subtype: {
                            value: entityData.subtype,
                            label: entityData.subtype,
                        },
                        description: entityData.description || '',
                        isPublic: entityData.isPublic || false,
                        aliases:
                            entityData.aliasesDetail
                                ?.filter((alias) => alias.id !== undefined)
                                .map((alias) => ({
                                    value: alias.id!,
                                    label: `${alias.subtype}:${alias.name}`,
                                })) ?? [],
                    });

                    setAccessUsers(accessData);
                    setEntity(entityData);
                } catch (err) {
                    console.error('Failed to fetch entity:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        })();
    }, [isEdit, id, entriesApi, accessApi]);

    // Handle form submission
    const handleSubmit = async (data: FormData) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype?.value || '',
            is_public: data.isPublic,
            aliases: data.aliases.map((alias) => alias.value),
        };

        if (isEdit) {
            await entriesApi.entitiesUpdate({
                entityId: Number(id),
                entityRequest: payload,
            });
        } else {
            const result = await entriesApi.entitiesCreate({
                entityRequest: payload,
            });
            if (onAdd) onAdd(result);
        }
    };

    // Auto-fill name when subtype changes (for new entities)
    const handleSubtypeChange = async (
        subtype: SubtypeOption | null,
        reset: (values: Partial<FormData>) => void,
        currentValues: FormData,
    ) => {
        if (!isEdit && subtype) {
            try {
                const response = await entriesApi.entriesNextNameRetrieve({
                    classSubtype: subtype.value,
                });
                reset({ ...currentValues, subtype, name: response.name || '' });
            } catch (err) {
                console.error('Failed to fetch next name:', err);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse cradle-text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-2xl px-4">
                <h1 className="text-center text-xl font-bold text-primary mb-4">
                    {isEdit ? 'Edit Entity' : 'Add New Entity'}
                </h1>

                <Tabs tabClass={TabClasses.PILL}>
                    <Tab title="Settings" classes="space-y-4">
                        <div className="p-8 backdrop-blur-sm rounded-md bg-cradle3 bg-opacity-20">
                            <Form<FormData>
                                schema={entitySchema}
                                defaultValues={initialData}
                                onSubmit={handleSubmit}
                                successMessage={
                                    isEdit
                                        ? 'Entity updated successfully!'
                                        : 'Entity created successfully!'
                                }
                                className="space-y-4"
                            >
                                {({ watch, reset, getValues }) => {
                                    const watchedSubtype = watch('subtype');

                                    return (
                                        <>
                                            <FormInput<FormData>
                                                name="name"
                                                label="Name"
                                                disabled={isEdit}
                                                required
                                            />

                                            <FormSelect<FormData, SubtypeOption>
                                                name="subtype"
                                                label="Subtype"
                                                options={subtypeOptions}
                                                isDisabled={isEdit}
                                                required
                                                onChange={(newValue) => {
                                                    handleSubtypeChange(
                                                        newValue as SubtypeOption | null,
                                                        reset,
                                                        getValues(),
                                                    );
                                                }}
                                            />

                                            <FormSwitch<FormData>
                                                name="isPublic"
                                                label="Publicly Available"
                                            />

                                            <FormTextArea<FormData>
                                                name="description"
                                                label="Description"
                                                placeholder="Description"
                                                rows={4}
                                            />

                                            <FormSelect<FormData, AliasOption, true>
                                                name="aliases"
                                                label="Aliases"
                                                fetchOptions={fetchAliases}
                                                isMulti
                                                placeholder="Select aliases..."
                                            />

                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-block"
                                            >
                                                {isEdit ? 'Edit' : 'Add'}
                                            </button>
                                        </>
                                    );
                                }}
                            </Form>
                        </div>
                    </Tab>

                    {isEdit && entity && accesses.length > 0 && (
                        <Tab title="Access" classes="space-y-4">
                            {accesses.map((access) => {
                                const user = access.user;
                                return (
                                    <AdminPanelPermissionCard
                                        key={user.id}
                                        userId={user.id!}
                                        text={user.username}
                                        entityId={entity.id!}
                                        accessLevel={access.accessType}
                                        searchKey={user.username}
                                    />
                                );
                            })}
                        </Tab>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
