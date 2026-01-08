import { toast } from 'sonner';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import { DigestSubclass } from '@/services/cradle/models/DigestSubclass';
import { DigestUploadFinalizeCreateRequest } from '@/services/cradle/models/DigestUploadFinalizeCreateRequest';
import type { Alert } from '@/types';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import ShadcnSelect from '@components/forms/ShadcnSelect';
import { Upload } from 'iconoir-react';
import { useCallback, useRef, useState } from 'react';
import * as Yup from 'yup';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface DataTypeOption {
    value: string;
    label: string;
    inferEntities: boolean;
}

interface AssociatedEntryOption {
    value: number; // Entry ID (BigAutoField)
    label: string;
}

interface FormValues {
    title: string;
    dataType: DataTypeOption | null;
    associatedEntry: AssociatedEntryOption[];
    files: File[];
}

interface TouchedFields {
    title?: boolean;
    dataType?: boolean;
    associatedEntry?: boolean;
    files?: boolean;
}

interface FormErrors {
    [key: string]: string;
}

export interface UploadDigestModalProps {
    closeModal: () => void;
    dataTypeOptions: DataTypeOption[];
    onUpload?: () => void;
}

const UploadSchema = Yup.object().shape({
    title: Yup.string().required('Digest title is required'),
    dataType: Yup.object()
        .shape({
            value: Yup.string().required('Data type is required'),
            label: Yup.string().required(),
            inferEntities: Yup.boolean(),
        })
        .required('Please select a data type'),
    associatedEntry: Yup.mixed().when('dataType', {
        is: (dataType: DataTypeOption | null) => dataType && !dataType.inferEntities,
        then: () =>
            Yup.array()
                .of(
                    Yup.object().shape({
                        value: Yup.string().required(),
                        label: Yup.string().required(),
                    }),
                )
                .notRequired(),
        otherwise: () => Yup.array(),
    }),
    files: Yup.array()
        .min(1, 'Please upload a file')
        .max(1, 'Only a single file is allowed')
        .required('File is required'),
});

// Utility function to get error styling classes
const getFieldErrorClasses = (hasError: boolean, baseClasses: string = ''): string => {
    if (hasError) {
        return `${baseClasses} border-destructive`.trim();
    }
    return `${baseClasses}`.trim();
};

// Error message component
const ErrorMessage: React.FC<{ children: React.ReactNode; id?: string }> = ({
    children,
    id,
}) => (
    <p id={id} className='mt-1 text-xs text-destructive flex items-center'>
        <svg
            className='w-3 h-3 mr-1 flex-shrink-0'
            fill='currentColor'
            viewBox='0 0 20 20'
        >
            <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
            />
        </svg>
        {children}
    </p>
);

export default function UploadDigestModal({
    closeModal,
    onUpload,
}: UploadDigestModalProps): JSX.Element {
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: '' });
    const [touched, setTouched] = useState<TouchedFields>({});
    const [errors, setErrors] = useState<FormErrors>({});
    const { queryApi, intelioApi, basePath } = useApi();
    const { execute } = useAPICall();
    const [formValues, setFormValues] = useState<FormValues>({
        title: '',
        dataType: null,
        associatedEntry: [],
        files: [],
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper function to update form values
    const updateFormValue = useCallback(
        <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
            setFormValues((prev) => ({ ...prev, [field]: value }));
        },
        [setFormValues],
    );

    // Helper function to mark field as touched
    const markFieldTouched = useCallback(
        (field: keyof TouchedFields) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
        },
        [setTouched],
    );

    const fetchRelatedEntries = async (
        query: string,
    ): Promise<AssociatedEntryOption[]> => {
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
            } else {
                toast.error('Failed to load associated entries');
                return [];
            }
        } catch (error) {
            return [];
        } finally {
            setEntriesLoading(false);
        }
    };

    const handleDataTypeChange = (value: DataTypeOption | null) => {
        updateFormValue('dataType', value);
        // Clear associated entries if inferEntities is true
        if (value?.inferEntities) {
            updateFormValue('associatedEntry', []);
        }
        markFieldTouched('dataType');
    };

    const handleAssociatedEntriesChange = (
        value: AssociatedEntryOption[],
    ) => {
        updateFormValue('associatedEntry', Array.from(value));
        markFieldTouched('associatedEntry');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFormValue('title', e.target.value);
        markFieldTouched('title');
    };

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                updateFormValue('files', [e.target.files[0]]);
                markFieldTouched('files');
            }
        },
        [updateFormValue, markFieldTouched],
    );

    const resetForm = () => {
        setFormValues({
            title: '',
            dataType: null,
            associatedEntry: [],
            files: [],
        });
        setTouched({});
        setErrors({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async (values: FormValues) => {
        setIsUploading(true);
        try {
            await execute(
                async () => {
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

                    await intelioApi.intelioDigestUploadFinalizeCreate({
                        uploadId: initiateData.uploadId,
                        digestUploadFinalizeCreateRequest: finalizeRequest,
                    });

                    setAlert({
                        color: 'green',
                        message: 'File uploaded successfully',
                        show: true,
                    });
                    notify({ text: 'File uploaded successfully', type: 'success' });

                    if (onUpload) {
                        onUpload();
                    }

                    // Close modal after successful upload
                    setTimeout(() => {
                        closeModal();
                    }, 1000);
                },
            );
        } catch (error) {
            toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const validateForm = async (): Promise<boolean> => {
        try {
            await UploadSchema.validate(formValues, { abortEarly: false });
            setErrors({});
            return true;
        } catch (err) {
            const formErrors: FormErrors = {};
            if (err instanceof Yup.ValidationError) {
                if (err.inner) {
                    err.inner.forEach((error) => {
                        if (error.path) {
                            formErrors[error.path] = error.message;
                        }
                    });
                } else if (err.path) {
                    formErrors[err.path] = err.message;
                }
            }
            console.error(formErrors);

            return false;
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched for validation display
        setTouched({
            title: true,
            dataType: true,
            associatedEntry: true,
            files: true,
        });

        const isValid = await validateForm();
        if (isValid) {
            await handleUpload(formValues);
        }
    };

    const fetchDigestTypes = async (query: string): Promise<DataTypeOption[]> => {
        const response = await execute(() => intelioApi.intelioDigestOptionsList(), {
            errorMessage: 'Failed to fetch digest types',
        });
        return response.map((type: DigestSubclass) => ({
            value: type.className,
            label: type.name,
            inferEntities: type.inferEntities,
        }));
    };

    // Check if form has errors for styling
    const titleError = touched.title && errors.title;
    const dataTypeError = touched.dataType && errors.dataType;
    const filesError = touched.files && errors.files;
    const associatedEntryError = touched.associatedEntry && errors.associatedEntry;

    return (
        <div className='w-[500px]'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-text-foreground tracking-wide'>
                        Upload Digest
                    </h2>
                </div>
            </div>

            <form onSubmit={onSubmit} className='w-full'>
                {/* Digest Title Field */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='digest-title' className={titleError ? 'text-destructive' : ''}>
                        Digest Title *
                    </Label>
                    <Input
                        id='digest-title'
                        type='text'
                        value={formValues.title}
                        onChange={handleTitleChange}
                        className={titleError ? 'border-destructive' : ''}
                        placeholder='Enter digest title'
                        aria-invalid={titleError ? 'true' : 'false'}
                        aria-describedby={titleError ? 'title-error' : undefined}
                        disabled={isUploading}
                    />
                    {titleError && (
                        <ErrorMessage id='title-error'>{errors.title}</ErrorMessage>
                    )}
                </div>

                {/* Data Type Selector */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='data-type' className={dataTypeError ? 'text-destructive' : ''}>
                        Data Type *
                    </Label>
                    <div
                        className={
                            dataTypeError
                                ? 'ring-2 ring-red-500 ring-opacity-50 rounded'
                                : ''
                        }
                    >
                        <ShadcnSelect
                            value={formValues.dataType}
                            onChange={handleDataTypeChange}
                            fetchOptions={fetchDigestTypes}
                            placeholder='Select digest type'
                            className='w-full'
                            width='w-full'
                            disabled={isUploading}
                        />
                    </div>
                    {dataTypeError && (
                        <ErrorMessage id='dataType-error'>
                            {errors.dataType}
                        </ErrorMessage>
                    )}
                </div>

                {/* File Upload Area */}
                <div className='mb-5'>
                    <Label htmlFor='file-upload' className={filesError ? 'text-destructive' : ''}>
                        Upload File *
                    </Label>
                    <div className='flex gap-2 items-stretch'>
                        <input
                            ref={fileInputRef}
                            id='file-upload'
                            type='file'
                            onChange={handleFileChange}
                            className={`flex-1 text-sm text-text-foreground cursor-pointer
                                border rounded-xl bg-bg-secondary/5 p-0
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-l-[11px] file:rounded-r-none
                                file:border-0 file:border-r file:border-border-border
                                file:bg-border-primary/10 file:text-border-primary
                                file:text-sm file:font-medium
                                file:cursor-pointer file:transition-colors
                                hover:file:bg-border-primary/20
                                ${filesError ? 'border-destructive' : 'border-border'}
                            `}
                            disabled={isUploading}
                            aria-invalid={filesError ? 'true' : 'false'}
                            aria-describedby={filesError ? 'files-error' : undefined}
                        />
                    </div>
                    {filesError && (
                        <ErrorMessage id='files-error'>{errors.files}</ErrorMessage>
                    )}
                </div>

                {/* Associated Entries Selector */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='associated-entries' className={associatedEntryError ? 'text-destructive' : ''}>
                        Associated Entries
                    </Label>
                    <div
                        className={
                            associatedEntryError
                                ? 'ring-2 ring-red-500 ring-opacity-50 rounded'
                                : ''
                        }
                    >
                        <ShadcnSelect
                            values={formValues.associatedEntry || []}
                            onMultiChange={handleAssociatedEntriesChange}
                            fetchOptions={fetchRelatedEntries}
                            isMulti={true}
                            placeholder={
                                formValues.dataType?.inferEntities
                                    ? 'Select entries (disabled)'
                                    : 'Select entries'
                            }
                            className='w-full'
                            width='w-full'
                            disabled={
                                !formValues.dataType ||
                                formValues.dataType.inferEntities ||
                                isUploading
                            }
                            aria-invalid={associatedEntryError ? 'true' : 'false'}
                            aria-describedby={
                                associatedEntryError
                                    ? 'associatedEntry-error'
                                    : undefined
                            }
                        />
                    </div>
                    {associatedEntryError && (
                        <ErrorMessage id='associatedEntry-error'>
                            {errors.associatedEntry}
                        </ErrorMessage>
                    )}
                </div>

                {alert.show && (
                    <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                        <WarningCircle />
                        <AlertDescription>{alert.message}</AlertDescription>
                    </AlertComponent>
                )}

                {/* Footer */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        onClick={closeModal}
                        disabled={isUploading}
                        type='button'
                        variant='outline'
                        size='sm'
                    >
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        disabled={isUploading}
                        variant='default'
                        size='sm'
                        aria-label={isUploading ? 'Uploading file' : 'Upload file'}
                    >
                        {isUploading ? (
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
    );
}
