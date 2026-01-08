import { Button } from '@/components/ui/button';
import useApi from '@/hooks/api/useApi';
import type { Alert } from '@/types';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import ShadcnSelect from '@components/forms/ShadcnSelect';
import { Upload } from 'iconoir-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Yup from 'yup';
import { Spinner } from '@/components/ui/spinner';

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
    associatedEntry: AssociatedEntryOption | AssociatedEntryOption[];
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

interface UploadFormProps {
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
            Yup.object()
                .shape({
                    value: Yup.string().required(),
                    label: Yup.string().required(),
                })
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


function UploadForm({ dataTypeOptions, onUpload }: UploadFormProps) {
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: '' });
    const [touched, setTouched] = useState<TouchedFields>({});
    const [errors, setErrors] = useState<FormErrors>({});
    const { queryApi, intelioApi } = useApi();
    const [formValues, setFormValues] = useState<FormValues>({
        title: '',
        dataType: null,
        associatedEntry: [],
        files: [],
    });

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
                setAlert({
                    color: 'red',
                    message: 'Failed to load associated entries',
                    show: true,
                });
                return [];
            }
        } catch (error) {
            setAlert({
                color: 'red',
                message: `Error fetching entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
                show: true,
            });
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

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                updateFormValue('files', [acceptedFiles[0]]);
                markFieldTouched('files');
            }
        },
        [updateFormValue, markFieldTouched],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {},
        maxFiles: 1,
    });

    const resetForm = () => {
        setFormValues({
            title: '',
            dataType: null,
            associatedEntry: [],
            files: [],
        });
        setTouched({});
        setErrors({});
    };

    const handleUpload = async (values: FormValues) => {
        setIsUploading(true);
        try {
            const requestParams: any = {
                digestType: values.dataType!.value,
                title: values.title,
                file: values.files[0], // API expects single file, not array
            };

            // Handle associatedEntry which could be a single value or array
            const associatedEntry = Array.isArray(values.associatedEntry)
                ? values.associatedEntry[0]
                : values.associatedEntry;

            if (associatedEntry?.value) {
                requestParams.entity = associatedEntry.value;
            }

            await intelioApi.intelioDigestCreate(requestParams);

            setAlert({
                color: 'green',
                message: 'File uploaded successfully',
                show: true,
            });
            resetForm();
            if (onUpload) {
                onUpload();
            }
        } catch (error) {
            setAlert({
                color: 'red',
                message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                show: true,
            });
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

            setAlert({
                color: 'red',
                message: Object.values(formErrors)
                    .map((msg) => `- ${msg}`)
                    .join('\n'),
                show: true,
            });
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

    // Check if form has errors for styling
    const hasErrors = Object.keys(errors).length > 0;
    const titleError = touched.title && errors.title;
    const dataTypeError = touched.dataType && errors.dataType;
    const filesError = touched.files && errors.files;
    const associatedEntryError = touched.associatedEntry && errors.associatedEntry;

    // Format file display text
    const getFileDisplayText = (): string => {
        if (formValues.files.length > 0) {
            const file = formValues.files[0];
            return `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
        return isDragActive ? 'Drop file here' : 'Drag file or click';
    };

    return (
        <form onSubmit={onSubmit} className='w-full'>
            <div className='grid grid-cols-5 gap-4 mb-4 px-4'>
                {/* Digest Title Field */}
                <div className='col-span-1'>
                    <label
                        className={`block text-sm font-medium mb-1 ${titleError ? 'text-destructive' : 'text-foreground'}`}
                    >
                        Digest Title *
                    </label>
                    <input
                        type='text'
                        value={formValues.title}
                        onChange={handleTitleChange}
                        className={getFieldErrorClasses(
                            !!titleError,
                            'w-full input input-block border-2  ',
                        )}
                        placeholder='Enter digest title'
                        aria-invalid={titleError ? 'true' : 'false'}
                        aria-describedby={titleError ? 'title-error' : undefined}
                    />
                    {titleError && (
                        <ErrorMessage id='title-error'>{errors.title}</ErrorMessage>
                    )}
                </div>

                {/* Data Type Selector */}
                <div className='col-span-1'>
                    <label
                        className={`block text-sm font-medium mb-1 ${dataTypeError ? 'text-destructive' : 'text-foreground'}`}
                    >
                        Data Type *
                    </label>
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
                            staticOptions={dataTypeOptions}
                            placeholder='Select digest type'
                            className='w-full'
                            width='w-full'
                        />
                    </div>
                    {dataTypeError && (
                        <ErrorMessage id='dataType-error'>
                            {errors.dataType}
                        </ErrorMessage>
                    )}
                </div>

                {/* File Upload Area */}
                <div className='col-span-1'>
                    <label
                        className={`block text-sm font-medium mb-1 ${filesError ? 'text-destructive' : 'text-foreground'}`}
                    >
                        Upload File *
                    </label>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-md p-2 text-center cursor-pointer h-10 flex items-center justify-center  ${
                            filesError
                                ? 'border-destructive bg-destructive/10 hover:border-destructive'
                                : isDragActive
                                  ? 'bg-primary/10 border-primary'
                                  : 'border-border hover:border-primary hover:bg-muted'
                        }`}
                        aria-invalid={filesError ? 'true' : 'false'}
                        aria-describedby={filesError ? 'files-error' : undefined}
                    >
                        <input {...getInputProps()} />
                        <p
                            className={`text-sm truncate ${filesError ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                            {getFileDisplayText()}
                        </p>
                    </div>
                    {filesError && (
                        <ErrorMessage id='files-error'>{errors.files}</ErrorMessage>
                    )}
                </div>

                {/* Associated Entries Selector */}
                <div className='col-span-1'>
                    <label
                        className={`block text-sm font-medium mb-1 ${associatedEntryError ? 'text-destructive' : 'text-foreground'}`}
                    >
                        Associated Entries
                    </label>
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
                                formValues.dataType.inferEntities
                            }
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

                {/* Submit Button */}
                <div className='col-span-1 flex items-end'>
                    <Button
                        type='submit'
                        variant='default'
                        disabled={isUploading}
                        className={`w-full flex items-center justify-center ${
                            hasErrors ? 'hover:bg-destructive/90' : ''
                        }`}
                        aria-label={isUploading ? 'Uploading file' : 'Upload file'}
                    >
                        {isUploading ? (
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
            {alert.show && (
                <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                    <WarningCircle />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}
        </form>
    );
}

export default UploadForm;
