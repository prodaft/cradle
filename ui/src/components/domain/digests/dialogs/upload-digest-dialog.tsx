import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from '@/components/custom/file-upload';
import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/query';
import { uploadFile } from '@/utils/files';
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudArrowUpIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}

interface DataTypeOption extends SelectOption<string> {
    inferEntities: boolean;
}

interface UploadDigestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dataTypeOptions?: DataTypeOption[]; // Optional - modal fetches types internally
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

export default function UploadDigestDialog({
    open,
    onOpenChange,
    onUpload,
    dataTypeOptions: propDataTypeOptions,
}: UploadDigestDialogProps): React.JSX.Element {
    const { data: dataTypesResponse } = useQuery({
        queryKey: [...queryKeys.digests.all, 'options'],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digest/options/',
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
        enabled: open && (!propDataTypeOptions || propDataTypeOptions.length === 0),
    });

    const dataTypeOptions = React.useMemo(() => {
        if (propDataTypeOptions && propDataTypeOptions.length > 0) {
            return propDataTypeOptions;
        }
        if (!dataTypesResponse) return [];
        return (dataTypesResponse as any[]).map((type: any) => ({
            value: type.class_name,
            label: type.name,
            inferEntities: type.infer_entities,
        }));
    }, [propDataTypeOptions, dataTypesResponse]);

    const form = useForm<FormValues>({
        resolver: zodResolver(UploadSchema) as any,
        defaultValues: {
            title: '',
            dataType: null as any,
            associatedEntry: [],
            files: [],
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const file = values.files[0];

            const {
                data: initiateData,
                error: initError,
                response: initResponse,
            } = await fetchClient.GET('/intelio/digest/upload/', {
                params: { query: { file_name: file.name, file_size: file.size } },
            });
            if (initError) throw { response: initResponse, error: initError };

            const initAny = initiateData as any;
            await uploadFile(initAny.presigned_url, file);

            const entities = (values.associatedEntry || []).map((e) => e.value);
            const uploadId = initAny.upload_id;

            const { data, error, response } = await fetchClient.POST(
                '/intelio/digest/upload/{upload_id}/finalize/',
                {
                    params: { path: { upload_id: uploadId } },
                    body: {
                        title: values.title,
                        digest_type: values.dataType!.value,
                        entities: entities.length > 0 ? entities : undefined,
                    } as any,
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.digests.lists() }],
            successMessage: 'File uploaded successfully',
        },
    });

    const onSubmit = async (values: FormValues) => {
        try {
            await uploadMutation.mutateAsync(values);
            onUpload?.();
            onOpenChange(false);
        } catch {
            // error handling is expected to be handled by react-query meta/toast layer
        }
    };

    const dataType = form.watch('dataType') as DataTypeOption | null;
    const isUploading = uploadMutation.isPending;

    useEffect(() => {
        if (!open) {
            form.reset({
                title: '',
                dataType: null as any,
                associatedEntry: [],
                files: [],
            });
        }
    }, [open, form]);

    const canSubmit =
        !isUploading &&
        !!form.watch('title')?.trim() &&
        !!form.watch('dataType') &&
        (form.watch('files')?.length ?? 0) > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    onSubmit={form.handleSubmit(onSubmit as any)}
                    className='contents'
                >
                    <DialogHeader>
                        <DialogTitle>Upload Digest</DialogTitle>
                        <DialogDescription>
                            Upload a file to create a new digest entry in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='gap-4'>
                        {/* Digest Title Field */}
                        <Controller
                            name='title'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>
                                        Digest Title{' '}
                                        <span className='text-destructive'>*</span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id={field.name}
                                        placeholder='Enter digest title'
                                        aria-invalid={fieldState.invalid}
                                        disabled={isUploading}
                                        required
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Data Type Selector */}
                        <Controller
                            name='dataType'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor='data-type'>
                                            Data Type{' '}
                                            <span className='text-destructive'>*</span>
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
                                                    const option = dataTypeOptions.find(
                                                        (opt) =>
                                                            opt.value === selectedValue,
                                                    );
                                                    onChange(option ?? null);
                                                }}
                                            >
                                                <SelectTrigger
                                                    id='data-type'
                                                    className='w-full'
                                                    aria-invalid={isInvalid}
                                                >
                                                    <SelectValue placeholder='Select digest type' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {dataTypeOptions.map((option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isInvalid && (
                                            <FieldError
                                                errors={[
                                                    {
                                                        message:
                                                            typeof fieldState.error
                                                                ?.message === 'string'
                                                                ? fieldState.error
                                                                      .message
                                                                : 'Please select a data type',
                                                    },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        />

                        {/* File Upload Area */}
                        <Controller
                            name='files'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                const files = value || [];
                                const hasSelectedFile = files.length > 0;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor='file-upload'>
                                            Upload File{' '}
                                            <span className='text-destructive'>*</span>
                                        </FieldLabel>
                                        <div
                                            id='file-upload'
                                            className={
                                                isInvalid
                                                    ? 'ring-2 ring-destructive ring-opacity-50 rounded'
                                                    : ''
                                            }
                                        >
                                            <FileUpload
                                                value={files}
                                                onValueChange={onChange}
                                                maxFiles={1}
                                                disabled={isUploading}
                                            >
                                                {/* Only show dropzone if no file selected */}
                                                {!hasSelectedFile && (
                                                    <FileUploadDropzone className='min-h-[100px]'>
                                                        <div className='flex flex-col items-center gap-2 text-center'>
                                                            <CloudArrowUpIcon
                                                                className='h-6 w-6 text-muted-foreground'
                                                                weight='bold'
                                                            />
                                                            <div className='text-sm text-muted-foreground'>
                                                                <span className='font-medium text-foreground'>
                                                                    Drop file here
                                                                </span>{' '}
                                                                or click to browse
                                                            </div>
                                                            <FileUploadTrigger asChild>
                                                                <Button
                                                                    type='button'
                                                                    variant='outline'
                                                                    size='sm'
                                                                >
                                                                    Select File
                                                                </Button>
                                                            </FileUploadTrigger>
                                                        </div>
                                                    </FileUploadDropzone>
                                                )}

                                                {/* Show selected file */}
                                                <FileUploadList>
                                                    {files.map((file: File) => (
                                                        <FileUploadItem
                                                            key={
                                                                file.name +
                                                                file.lastModified
                                                            }
                                                            value={file}
                                                            className='group'
                                                        >
                                                            <FileUploadItemPreview />
                                                            <FileUploadItemMetadata size='sm' />
                                                            <FileUploadItemDelete
                                                                asChild
                                                            >
                                                                <Button
                                                                    type='button'
                                                                    variant='ghost'
                                                                    size='icon'
                                                                    className='h-6 w-6'
                                                                    disabled={
                                                                        isUploading
                                                                    }
                                                                >
                                                                    <XIcon
                                                                        className='h-4 w-4'
                                                                        weight='bold'
                                                                    />
                                                                    <span className='sr-only'>
                                                                        Remove file
                                                                    </span>
                                                                </Button>
                                                            </FileUploadItemDelete>
                                                        </FileUploadItem>
                                                    ))}
                                                </FileUploadList>
                                            </FileUpload>
                                        </div>
                                        {isInvalid && (
                                            <FieldError
                                                errors={[
                                                    {
                                                        message:
                                                            typeof fieldState.error
                                                                ?.message === 'string'
                                                                ? fieldState.error
                                                                      .message
                                                                : 'Please upload a file',
                                                    },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        />

                        {/* Associated Entries Selector */}
                        <Controller
                            name='associatedEntry'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor='associated-entries'>
                                            Associated Entries
                                        </FieldLabel>
                                        <div
                                            id='associated-entries'
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
                                                disabled={Boolean(
                                                    dataType?.inferEntities,
                                                )}
                                                onSearch={async (query) => {
                                                    const { data, error } =
                                                        await fetchClient.GET(
                                                            '/query/',
                                                            {
                                                                params: {
                                                                    query: {
                                                                        name: query,
                                                                        type: 'entity',
                                                                    } as any,
                                                                },
                                                            },
                                                        );
                                                    if (error) return [];
                                                    const results = (data as any)
                                                        ?.results;
                                                    if (results) {
                                                        return results.map(
                                                            (entry: any) => ({
                                                                value: String(
                                                                    entry.id!,
                                                                ),
                                                                label: `${entry.subtype}:${entry.name}`,
                                                            }),
                                                        ) as unknown as Option[];
                                                    }
                                                    return [];
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
                                                                ?.message === 'string'
                                                                ? fieldState.error
                                                                      .message
                                                                : 'Invalid associated entries',
                                                    },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        />
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={isUploading}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type='submit'
                            disabled={!canSubmit}
                            variant='default'
                            size='sm'
                            aria-label={isUploading ? 'Uploading file' : 'Upload file'}
                        >
                            {isUploading ? (
                                <>
                                    <Spinner />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <UploadSimpleIcon size={16} weight='bold' />
                                    Upload
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
