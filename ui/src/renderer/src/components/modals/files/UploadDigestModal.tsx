import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { DigestSubclass } from '@/services/cradle/models/DigestSubclass';
import { DigestUploadFinalizeCreateRequest } from '@/services/cradle/models/DigestUploadFinalizeCreateRequest';
import { uploadFile } from '@/utils/files';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload } from 'iconoir-react';
import React, { useRef } from 'react';
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

export interface UploadDigestModalProps {
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

export default function UploadDigestModal({
    open,
    onOpenChange,
    onUpload,
    dataTypeOptions: propDataTypeOptions,
}: UploadDigestModalProps): React.JSX.Element {
    const { queryApi, intelioApi } = useApi();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch data type options if not provided
    const { data: dataTypesResponse } = useQuery({
        queryKey: ['digestDataTypes'],
        queryFn: () => intelioApi.intelioDigestOptionsList(),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load data types',
        },
        enabled: open && (!propDataTypeOptions || propDataTypeOptions.length === 0),
    });

    const dataTypeOptions = React.useMemo(() => {
        if (propDataTypeOptions && propDataTypeOptions.length > 0) {
            return propDataTypeOptions;
        }
        if (!dataTypesResponse) return [];
        return dataTypesResponse.map((type: DigestSubclass) => ({
            value: type.className,
            label: type.name,
            inferEntities: type.inferEntities,
        }));
    }, [propDataTypeOptions, dataTypesResponse]);

    const form = useForm<z.infer<typeof UploadSchema>>({
        resolver: zodResolver(UploadSchema) as any,
        defaultValues: {
            title: '',
            dataType: null as any,
            associatedEntry: [],
            files: [],
        },
    });

    // Upload mutation - handles multi-step upload process
    const uploadMutation = useMutation({
        mutationFn: async (values: z.infer<typeof UploadSchema>) => {
            const file = values.files[0];

            // Step 1: Request presigned URL from backend
            const initiateData = await intelioApi.intelioDigestUploadRetrieve({
                fileName: file.name,
                fileSize: file.size,
            });

            // Step 2: Upload file directly to presigned URL
            await uploadFile(initiateData.presignedUrl, file);

            // Step 3: Finalize upload (creates digest record and triggers processing)
            const entities = (values.associatedEntry || []).map((e) => e.value);
            const finalizeRequest: DigestUploadFinalizeCreateRequest = {
                title: values.title,
                digestType: values.dataType!.value,
                entities: entities.length > 0 ? entities : undefined,
            };

            return await intelioApi.intelioDigestUploadFinalizeCreate({
                uploadId: initiateData.uploadId,
                digestUploadFinalizeCreateRequest: finalizeRequest,
            });
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.digests.lists() }],
            successMessage: 'File uploaded successfully',
        },
    });

    const onSubmit = async (values: z.infer<typeof UploadSchema>) => {
        uploadMutation.mutate(values, {
            onSuccess: () => {
                if (onUpload) {
                    onUpload();
                }
                // Close modal after successful upload
                setTimeout(() => {
                    onOpenChange(false);
                }, 1000);
            },
        });
    };

    const dataType = form.watch('dataType') as DataTypeOption | null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Digest</DialogTitle>
                    <DialogDescription>
                        Upload a file to create a new digest entry in the system.
                    </DialogDescription>
                </DialogHeader>
                <div className='w-full max-w-full'>
                    <form onSubmit={form.handleSubmit(onSubmit as any)}>
                        {/* Digest Title Field */}
                        <Controller
                            name='title'
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field
                                    data-invalid={fieldState.invalid}
                                    className='mb-5'
                                >
                                    <FieldContent>
                                        <FieldLabel htmlFor={field.name}>
                                            Digest Title *
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={field.name}
                                            placeholder='Enter digest title'
                                            aria-invalid={fieldState.invalid}
                                            disabled={uploadMutation.isPending}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </FieldContent>
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
                                    <Field data-invalid={isInvalid} className='mb-5'>
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

                        {/* File Upload Area */}
                        <Controller
                            name='files'
                            control={form.control}
                            render={({ field: { onChange }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid} className='mb-5'>
                                        <FieldContent>
                                            <FieldLabel htmlFor='file-upload'>
                                                Upload File *
                                            </FieldLabel>
                                            <Input
                                                ref={fileInputRef}
                                                id='file-upload'
                                                type='file'
                                                onChange={(e) => {
                                                    if (
                                                        e.target.files &&
                                                        e.target.files.length > 0
                                                    ) {
                                                        onChange([e.target.files[0]]);
                                                    }
                                                }}
                                                className={`w-full ${
                                                    isInvalid
                                                        ? 'border-destructive'
                                                        : ''
                                                }`}
                                                disabled={uploadMutation.isPending}
                                                aria-invalid={isInvalid}
                                                aria-describedby={
                                                    isInvalid
                                                        ? 'files-error'
                                                        : undefined
                                                }
                                            />
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

                        {/* Associated Entries Selector */}
                        <Controller
                            name='associatedEntry'
                            control={form.control}
                            render={({ field: { onChange, value }, fieldState }) => {
                                const isInvalid =
                                    fieldState.invalid && fieldState.isTouched;
                                return (
                                    <Field data-invalid={isInvalid} className='mb-5'>
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
                                                        const response =
                                                            await queryApi.queryList({
                                                                name: [query],
                                                                type: 'entity',
                                                            });
                                                        if (
                                                            response &&
                                                            response.results
                                                        ) {
                                                            return response.results.map(
                                                                (entry) => ({
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

                        {/* Footer */}
                        <div className='flex justify-end gap-2 mt-4'>
                            <Button
                                onClick={() => onOpenChange(false)}
                                disabled={form.formState.isSubmitting}
                                type='button'
                                variant='outline'
                                size='sm'
                            >
                                Cancel
                            </Button>
                            <Button
                                type='submit'
                                disabled={form.formState.isSubmitting}
                                variant='default'
                                size='sm'
                                aria-label={
                                    form.formState.isSubmitting
                                        ? 'Uploading file'
                                        : 'Upload file'
                                }
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload width={16} height={16} />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
