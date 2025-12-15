import useApi from '@/hooks/api/useApi';
import { GoldenRatioColorGenerator } from '@/utils/colors/colorUtils';
import {
    EntryClass,
    EntryClassRequest,
    EntryClassRequestTypeEnum,
} from '@services/cradle/models';
import { useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import {
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsSeparator,
    SettingsTextArea,
} from '../../../forms';
import { useNotif } from '@/contexts/ui/NotificationContext';
import Selector from '../../../forms/Selector';

interface EntryTypeFormProps {
    id?: string | null;
    isEdit?: boolean;
    onAdd?: (result: EntryClass) => void;
}

interface ChildOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface TypeOption extends SelectOption<string> {
    value: EntryClassRequestTypeEnum;
    label: string;
}

interface FormatOption extends SelectOption<string> {
    value: string;
    label: string;
}

interface EntryTypeFormValues {
    type: TypeOption | null;
    subtype: string;
    description: string;
    prefix: string;
    typeFormat: FormatOption | null;
    regex: string;
    options: string;
    generativeRegex: string;
    color: string;
    children: ChildOption[];
}

const typeOptions: TypeOption[] = [
    { value: EntryClassRequestTypeEnum.Artifact, label: 'Artifact' },
    { value: EntryClassRequestTypeEnum.Entity, label: 'Entity' },
];

const formatOptions: FormatOption[] = [
    { value: 'any', label: 'Any Format' },
    { value: 'options', label: 'Enumerator' },
    { value: 'regex', label: 'Regex' },
];

const entryTypeSchema: Yup.ObjectSchema<EntryTypeFormValues> = Yup.object().shape({
    type: Yup.object()
        .shape({
            value: Yup.string()
                .required()
                .oneOf([
                    EntryClassRequestTypeEnum.Artifact,
                    EntryClassRequestTypeEnum.Entity,
                ]),
            label: Yup.string().required(),
        })
        .nullable()
        .required('Class Type is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().default(''),
    prefix: Yup.string().default(''),
    typeFormat: Yup.object()
        .shape({ value: Yup.string().required(), label: Yup.string().required() })
        .nullable()
        .default(null),
    regex: Yup.string().default(''),
    options: Yup.string().default(''),
    generativeRegex: Yup.string().default(''),
    color: Yup.string().required('Color is required'),
    children: Yup.array().default([]),
});


export default function EntryTypeForm({
    id = null,
    isEdit = false,
    onAdd,
}: EntryTypeFormProps) {
    const { entriesApi } = useApi();
    const { notify } = useNotif();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [entryTypes, setEntryTypes] = useState<ChildOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<EntryTypeFormValues>({
        resolver: yupResolver(entryTypeSchema),
        defaultValues: {
            type: typeOptions[0],
            subtype: '',
            description: '',
            prefix: '',
            typeFormat: null,
            regex: '',
            options: '',
            generativeRegex: '',
            color: colorGenerator.nextHexColor(),
            children: [],
        },
    });

    // Fetch all entry types for the Children selector
    const fetchEntryTypes = async () => {
        try {
            const entries = await entriesApi.entryClassesList({});
            setEntryTypes(
                entries.map((entry: EntryClass) => ({
                    value: entry.subtype,
                    label: entry.subtype,
                })),
            );
        } catch (err) {
            console.error('Failed to fetch entry types:', err);
        }
    };

    // Fetch entry type details in edit mode
    useEffect(() => {
        const loadData = async () => {
            await fetchEntryTypes();

            if (isEdit && id) {
                try {
                    const entrytype = await entriesApi.entryClassesRetrieve({
                        classSubtype: id,
                    });
                    reset({
                        type:
                            typeOptions.find((o) => o.value === entrytype.type) ||
                            typeOptions[0],
                        subtype: entrytype.subtype,
                        description: entrytype.description || '',
                        prefix: entrytype.prefix || '',
                        color: entrytype.color || colorGenerator.nextHexColor(),
                        generativeRegex: entrytype.generativeRegex || '',
                        typeFormat:
                            formatOptions.find((o) => o.value === entrytype.format) ||
                            formatOptions[0],
                        regex: entrytype.regex || '',
                        options: entrytype.options || '',
                        children:
                            entrytype.childrenDetail?.map((x: any) => ({
                                value: x.subtype,
                                label: x.subtype,
                            })) || [],
                    });
                } catch (err) {
                    console.error('Failed to fetch entry type:', err);
                }
            }
            setIsLoading(false);
        };

        loadData();
    }, [isEdit, id, entriesApi, colorGenerator, reset]);

    const onSubmit = async (data: EntryTypeFormValues) => {
        try {
            const payload: EntryClassRequest = {
                generativeRegex: data.generativeRegex,
                format:
                    data.typeFormat?.value === 'any'
                        ? null
                        : data.typeFormat?.value ?? null,
                type: data.type?.value || EntryClassRequestTypeEnum.Artifact,
                subtype: data.subtype,
                description: data.description,
                prefix: data.prefix,
                color: data.color,
                regex: data.regex,
                options: data.options,
                children: data.children?.map((child) => child.value) ?? [],
            };

            let result: EntryClass;
            if (isEdit && id) {
                result = await entriesApi.entryClassesUpdate({
                    classSubtype: id,
                    entryClassRequest: payload,
                });
                notify({
                    type: 'success',
                    text: 'Entry type updated successfully!',
                });
            } else {
                result = await entriesApi.entryClassesCreate({
                    entryClassRequest: payload,
                });
                notify({
                    type: 'success',
                    text: 'Entry type created successfully!',
                });
            }

            if (!isEdit && onAdd) onAdd(result);
        } catch (error) {
            notify({
                type: 'error',
                text: `Failed to ${isEdit ? 'update' : 'create'} entry type`,
            });
        }
    };

    const watchType = watch('type');
    const watchTypeFormat = watch('typeFormat');
    const watchColor = watch('color');
    const isEntity = watchType?.value === 'entity';
    const isArtifact = watchType?.value === 'artifact';
    const isOptions = watchTypeFormat?.value === 'options';
    const isRegex = watchTypeFormat?.value === 'regex';

    const generateRandomColor = () => {
        setValue('color', colorGenerator.nextHexColor());
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    {isEdit ? 'Edit Entry Type' : 'Add New Entry Type'}
                </h1>
                <div className='bg-cradle3 p-8 bg-opacity-20 rounded-md'>
                    <Form<EntryTypeFormValues>
                        schema={entryTypeSchema}
                        defaultValues={initialData}
                        onSubmit={handleSubmit}
                        successMessage='Entry Type saved successfully!'
                        className='space-y-4'
                    >
                        {({ watch }) => {
                            const watchType = watch('type');
                            const watchTypeFormat = watch('typeFormat');
                            const isEntity = watchType?.value === 'entity';
                            const isArtifact = watchType?.value === 'artifact';
                            const isOptions = watchTypeFormat?.value === 'options';
                            const isRegex = watchTypeFormat?.value === 'regex';

                            return (
                                <>
                                    <Tabs tabClass={TabClasses.PILL}>
                                        <Tab title='Basic' classes='space-y-4 pt-4'>
                                            <FormSelect<EntryTypeFormValues, TypeOption>
                                                name='type'
                                                label='Class Type'
                                                options={typeOptions}
                                                required
                                            />

                                            <FormInput<EntryTypeFormValues>
                                                name='subtype'
                                                label={isEdit ? 'Name' : 'Subtype'}
                                                required
                                            />

                                            <FormTextArea<EntryTypeFormValues>
                                                name='description'
                                                label='Description'
                                                placeholder='Description'
                                            />

                                            <ColorPickerField />
                                        </Tab>

                                        <Tab title='Advanced' classes='space-y-4 pt-4'>
                                            {isEntity && (
                                                <FormInput<EntryTypeFormValues>
                                                    name='prefix'
                                                    label='Prefix'
                                                />
                                            )}

                                            {isArtifact && (
                                                <>
                                                    <FormSelect<
                                                        EntryTypeFormValues,
                                                        FormatOption
                                                    >
                                                        name='typeFormat'
                                                        label='Format'
                                                        options={formatOptions}
                                                        isClearable
                                                    />

                                                    {isOptions && (
                                                        <FormTextArea<EntryTypeFormValues>
                                                            name='options'
                                                            label='Options'
                                                            placeholder='Enter possible values separated by newlines.'
                                                        />
                                                    )}

                                                    {isRegex && (
                                                        <FormTextArea<EntryTypeFormValues>
                                                            name='regex'
                                                            label='Regex'
                                                            placeholder='Enter the regex for the type.'
                                                        />
                                                    )}

                                                    {!isOptions && (
                                                        <FormTextArea<EntryTypeFormValues>
                                                            name='generativeRegex'
                                                            label='Generative Regex'
                                                            placeholder='Regex used to generate random values.'
                                                        />
                                                    )}
                                                </>
                                            )}

                                            <FormSelect<
                                                EntryTypeFormValues,
                                                ChildOption,
                                                true
                                            >
                                                name='children'
                                                label='Children'
                                                options={entryTypes}
                                                isMulti
                                                placeholder='Select child entry types...'
                                            />
                                        </Tab>
                                    </Tabs>

                                    <div className='flex gap-2 pt-4'>
                                        <button
                                            type='submit'
                                            className='btn btn-primary btn-block'
                                        >
                                            {isEdit ? 'Edit' : 'Add'}
                                        </button>
                                    </div>
                                </>
                            );
                        }}
                    </Form>
                </div>
            </div>
        </div>
    );
}
