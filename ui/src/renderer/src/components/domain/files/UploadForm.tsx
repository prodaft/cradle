import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/useApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'iconoir-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}

interface DataTypeOption extends SelectOption<string> {
    inferEntities: boolean;
}

interface AssociatedEntryOption extends SelectOption<number> {
    // value: number (inherited from SelectOption<number>)
    // label: string (inherited from SelectOption<number>)
}

interface UploadFormProps {
    dataTypeOptions: DataTypeOption[];
    onUpload?: () => void;
}

const UploadSchema = z.object({
    title: z.string().min(1, { error: 'Digest title is required' }),
    dataType: z
        .object({
            value: z.string().min(1, { error: 'Data type is required' }),
            label: z.string().min(1),
            inferEntities: z.boolean(),
        })
        .nullable()
        .refine((val) => val !== null, {
            error: 'Please select a data type',
        }),
    associatedEntry: z
        .array(
            z.object({
                value: z.number(),
                label: z.string().min(1),
            }),
        )
        .default([]),
    files: z
        .array(z.instanceof(File))
        .min(1, { error: 'Please upload a file' })
        .max(1, { error: 'Only a single file is allowed' }),
});

type FormValues = z.infer<typeof UploadSchema>;

function UploadForm({ dataTypeOptions, onUpload }: UploadFormProps) {
    const [entriesLoading, setEntriesLoading] = useState(false);
    const { queryApi, intelioApi } = useApi();

    const form = useForm<FormValues>({
        resolver: zodResolver(UploadSchema) as any,
        defaultValues: {
            title: '',
            dataType: null as any,
            associatedEntry: [],
            files: [],
        },
    });

    const fetchRelatedEntries = async (
        query: string,
    ): Promise<SelectOption<number>[]> => {
        setEntriesLoading(true);
        try {
            const response = await queryApi.queryList({
                name: [query],
                type: 'entity',
            });
            if (response && response.results) {
                return response.results.map((entry) => ({
                    value: entry.id!,
                    label: `${entry.subtype}:${entry.name}`,
                }));
            }
            return [];
        } catch (error) {
            return [];
        } finally {
            setEntriesLoading(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof UploadSchema>) => {
        const requestParams: any = {
            digestType: values.dataType!.value,
            title: values.title,
            file: values.files[0], // API expects single file, not array
        };

        // Handle associatedEntry (always an array from multi-select)
        if (values.associatedEntry.length > 0) {
            requestParams.entity = values.associatedEntry[0].value;
        }

        await intelioApi.intelioDigestCreate(requestParams);

        if (onUpload) {
            onUpload();
        }

        // Reset form on success
        form.reset();
    };

    const dataType = form.watch('dataType') as DataTypeOption | null;
    const files = form.watch('files');

    // Format file display text
    const getFileDisplayText = (): string => {
        if (files && files.length > 0) {
            const file = files[0];
            return `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
        return 'Drag file or click';
    };

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                form.setValue('files', [acceptedFiles[0]]);
            }
        },
        [form],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {},
        maxFiles: 1,
        disabled: form.formState.isSubmitting,
    });

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)}>
            <div className='w-full'>
                <div className='grid grid-cols-5 gap-4 mb-4 px-4'>
                    {/* Digest Title Field */}
                    <div className='col-span-1'>
                        <Controller
                            name='title'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldContent>
                                        <FieldLabel htmlFor={field.name}>
                                            Digest Title *
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={field.name}
                                            placeholder='Enter digest title'
                                            aria-invalid={fieldState.invalid}
                                            disabled={form.formState.isSubmitting}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>

                    {/* Data Type Selector */}
                    <div className='col-span-1'>
                        <Controller
                            name='dataType'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldContent>
                                            <FieldLabel htmlFor='data-type'>
                                                Data Type *
                                            </FieldLabel>
                                            <div
                                                className={
                                                    isInvalid
                                                        ? 'ring-2 ring-red-500 ring-opacity-50 rounded'
                                                        : ''
                                                }
                                            >
                                                <Select
                                                    value={value?.value || ''}
                                                    onValueChange={(selectedValue) => {
                                                        const option =
                                                            dataTypeOptions.find(
                                                                (opt) =>
                                                                    opt.value ===
                                                                    selectedValue,
                                                            );
                                                        onChange(
                                                            option ? option : null,
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        className='w-full'
                                                        aria-invalid={isInvalid}
                                                    >
                                                        <SelectValue placeholder='Select digest type' />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {dataTypeOptions.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={option.value}
                                                                    value={option.value}
                                                                >
                                                                    {option.label}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {isInvalid && (
                                                <FieldError
                                                    errors={[
                                                        {
                                                            message:
                                                                typeof fieldState.error
                                                                    ?.message ===
                                                                'string'
                                                                    ? fieldState.error
                                                                          .message
                                                                    : 'Please select a data type',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </FieldContent>
                                    </Field>
                                );
                            }}
                        />
                    </div>

                    {/* File Upload Area */}
                    <div className='col-span-1'>
                        <Controller
                            name='files'
                            control={form.control}
                            render={({ field: { onChange }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldContent>
                                            <FieldLabel htmlFor='file-upload'>
                                                Upload File *
                                            </FieldLabel>
                                            <div
                                                {...getRootProps()}
                                                className={`border-2 border-dashed rounded-md p-2 text-center cursor-pointer h-10 flex items-center justify-center ${
                                                    isInvalid
                                                        ? 'border-destructive bg-destructive/10 hover:border-destructive'
                                                        : isDragActive
                                                          ? 'bg-primary/10 border-primary'
                                                          : 'border-border hover:border-primary hover:bg-muted'
                                                }`}
                                                aria-invalid={isInvalid}
                                                aria-describedby={
                                                    isInvalid
                                                        ? 'files-error'
                                                        : undefined
                                                }
                                            >
                                                <input
                                                    {...getInputProps()}
                                                    onChange={(e) => {
                                                        if (
                                                            e.target.files &&
                                                            e.target.files.length > 0
                                                        ) {
                                                            onChange([
                                                                e.target.files[0],
                                                            ]);
                                                        }
                                                    }}
                                                />
                                                <p
                                                    className={`text-sm truncate ${
                                                        isInvalid
                                                            ? 'text-destructive'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {isDragActive
                                                        ? 'Drop file here'
                                                        : getFileDisplayText()}
                                                </p>
                                            </div>
                                            {isInvalid && (
                                                <FieldError
                                                    errors={[
                                                        {
                                                            message:
                                                                typeof fieldState.error
                                                                    ?.message ===
                                                                'string'
                                                                    ? fieldState.error
                                                                          .message
                                                                    : 'Please upload a file',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </FieldContent>
                                    </Field>
                                );
                            }}
                        />
                    </div>

                    {/* Associated Entries Selector */}
                    <div className='col-span-1'>
                        <Controller
                            name='associatedEntry'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldContent>
                                            <FieldLabel htmlFor='associated-entries'>
                                                Associated Entries
                                            </FieldLabel>
                                            <div
                                                className={
                                                    isInvalid
                                                        ? 'ring-2 ring-red-500 ring-opacity-50 rounded'
                                                        : ''
                                                }
                                            >
                                                <MultipleSelector
                                                    value={
                                                        (value?.map((e) => ({
                                                            value: String(e.value),
                                                            label: e.label,
                                                        })) || []) as Option[]
                                                    }
                                                    defaultOptions={[]}
                                                    placeholder={
                                                        dataType?.inferEntities
                                                            ? 'Select entries (auto-inferred)'
                                                            : 'Select entries'
                                                    }
                                                    disabled={
                                                        dataType?.inferEntities || false
                                                    }
                                                    onSearch={async (query) => {
                                                        const results =
                                                            await fetchRelatedEntries(
                                                                query,
                                                            );
                                                        return results.map((e) => ({
                                                            value: String(e.value),
                                                            label: e.label,
                                                        })) as unknown as Option[];
                                                    }}
                                                    onChange={(options) => {
                                                        onChange(
                                                            options.map((o) => ({
                                                                value: Number(o.value),
                                                                label: o.label,
                                                            })),
                                                        );
                                                    }}
                                                    emptyIndicator={
                                                        <p className='text-center text-sm'>
                                                            No entries found
                                                        </p>
                                                    }
                                                    className='w-full'
                                                />
                                            </div>
                                            {isInvalid && (
                                                <FieldError
                                                    errors={[
                                                        {
                                                            message:
                                                                typeof fieldState.error
                                                                    ?.message ===
                                                                'string'
                                                                    ? fieldState.error
                                                                          .message
                                                                    : 'Invalid associated entries',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </FieldContent>
                                    </Field>
                                );
                            }}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className='col-span-1 flex items-end'>
                        <Button
                            type='submit'
                            variant='default'
                            disabled={form.formState.isSubmitting}
                            className='w-full flex items-center justify-center'
                            aria-label={
                                form.formState.isSubmitting
                                    ? 'Uploading file'
                                    : 'Upload file'
                            }
                        >
                            {form.formState.isSubmitting ? (
                                <>
                                    <Spinner className='size-4 text-white' />
                                    <span className='ml-2'>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className='mr-2 text-primary' />
                                    Upload
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default UploadForm;
