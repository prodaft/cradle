import { Upload } from 'iconoir-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Yup from 'yup';
import { saveDigest } from '../../services/intelioService/intelioService';
import { queryEntries } from '../../services/queryService/queryService';
import AlertBox from '../AlertBox/AlertBox';
import Selector from '../Selector/Selector';

const UploadSchema = Yup.object().shape({
    title: Yup.string().required('Digest title is required'),
    dataType: Yup.object()
        .shape({
            value: Yup.string().required('Data type is required'),
            label: Yup.string().required(),
            inferEntities: Yup.boolean(),
        })
        .required('Please select a data type'),
    associatedEntry: Yup.object().when('dataType', {
        is: (dataType) => dataType && !dataType.inferEntities,
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
const getFieldErrorClasses = (hasError, baseClasses = '') => {
    if (hasError) {
        return `${baseClasses} border-red-300`.trim();
    }
    return `${baseClasses}`.trim();
};

// Error message component
const ErrorMessage = ({ children }) => (
    <p className='mt-1 text-xs text-red-600 flex items-center'>
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

// Loading spinner component
const LoadingSpinner = () => (
    <div className='h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin' />
);

function UploadForm({ dataTypeOptions, onUpload }) {
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: '' });
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});
    const [formValues, setFormValues] = useState({
        title: '',
        dataType: null,
        associatedEntry: [],
        files: [],
    });

    // Helper function to update form values
    const updateFormValue = useCallback(
        (field, value) => {
            setFormValues((prev) => ({ ...prev, [field]: value }));
        },
        [setFormValues],
    );

    // Helper function to mark field as touched
    const markFieldTouched = useCallback(
        (field) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
        },
        [setTouched],
    );

    const fetchRelatedEntries = async (query) => {
        setEntriesLoading(true);
        try {
            const response = await queryEntries({ name: `${query}`, type: 'entity' });
            if (response.status === 200) {
                return response.data.results.map((entry) => ({
                    value: entry.id,
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
                message: `Error fetching entries: ${error.message}`,
                show: true,
            });
            return [];
        } finally {
            setEntriesLoading(false);
        }
    };

    const handleDataTypeChange = (value) => {
        updateFormValue('dataType', value);
        // Clear associated entries if inferEntities is true
        if (value?.inferEntities) {
            updateFormValue('associatedEntry', []);
        }
        markFieldTouched('dataType');
    };

    const handleAssociatedEntriesChange = (value) => {
        updateFormValue('associatedEntry', value);
        markFieldTouched('associatedEntry');
    };

    const handleTitleChange = (e) => {
        updateFormValue('title', e.target.value);
        markFieldTouched('title');
    };

    const onDrop = useCallback(
        (acceptedFiles) => {
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

    const handleUpload = async (values) => {
        setIsUploading(true);
        try {
            const body = {
                digest_type: values.dataType.value,
                title: values.title,
            };

            if (values.associatedEntry?.value) {
                body.entity = values.associatedEntry.value;
            }

            const response = await saveDigest(body, values.files);

            if (response.status === 201) {
                setAlert({
                    color: 'green',
                    message: 'File uploaded successfully',
                    show: true,
                });
                resetForm();
            } else {
                setAlert({
                    color: 'red',
                    message: 'Upload failed',
                    show: true,
                });
            }
        } catch (error) {
            setAlert({
                color: 'red',
                message: `Upload failed: ${error.message}`,
                show: true,
            });
        } finally {
            setIsUploading(false);
        }
    };

    const validateForm = async () => {
        try {
            console.log(formValues);
            await UploadSchema.validate(formValues, { abortEarly: false });
            setErrors({});
            return true;
        } catch (err) {
            const formErrors = {};
            if (err.inner) {
                err.inner.forEach((error) => {
                    formErrors[error.path] = error.message;
                });
            } else if (err.path) {
                formErrors[err.path] = err.message;
            }

            setAlert({
                color: 'red',
                message: '\n'.join(Object.values(formErrors).map((msg) => `- ${msg}`)),
                show: true,
            });
            return false;
        }
    };

    const onSubmit = async (e) => {
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
    const getFileDisplayText = () => {
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
                        className={`block text-sm font-medium mb-1 ${titleError ? 'text-red-700' : 'text-gray-700'}`}
                    >
                        Digest Title *
                    </label>
                    <input
                        type='text'
                        value={formValues.title}
                        onChange={handleTitleChange}
                        className={getFieldErrorClasses(
                            titleError,
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
                        className={`block text-sm font-medium mb-1 ${dataTypeError ? 'text-red-700' : 'text-gray-700'}`}
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
                        <Selector
                            value={formValues.dataType}
                            onChange={handleDataTypeChange}
                            staticOptions={dataTypeOptions}
                            placeholder='Select digest type'
                            className='w-full'
                            isMulti={false}
                            aria-invalid={dataTypeError ? 'true' : 'false'}
                            aria-describedby={
                                dataTypeError ? 'dataType-error' : undefined
                            }
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
                        className={`block text-sm font-medium mb-1 ${filesError ? 'text-red-700' : 'text-gray-700'}`}
                    >
                        Upload File *
                    </label>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-md p-2 text-center cursor-pointer h-10 flex items-center justify-center  ${
                            filesError
                                ? 'border-red-300 bg-red-50 hover:border-red-400'
                                : isDragActive
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }`}
                        aria-invalid={filesError ? 'true' : 'false'}
                        aria-describedby={filesError ? 'files-error' : undefined}
                    >
                        <input {...getInputProps()} />
                        <p
                            className={`text-sm truncate ${filesError ? 'text-red-600' : 'text-gray-500'}`}
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
                        className={`block text-sm font-medium mb-1 ${associatedEntryError ? 'text-red-700' : 'text-gray-700'}`}
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
                        <Selector
                            value={formValues.associatedEntry}
                            onChange={handleAssociatedEntriesChange}
                            fetchOptions={fetchRelatedEntries}
                            isLoading={entriesLoading}
                            isMulti={true}
                            placeholder={
                                formValues.dataType?.inferEntities
                                    ? 'Select entries (disabled)'
                                    : 'Select entries'
                            }
                            className='w-full'
                            isDisabled={
                                !formValues.dataType ||
                                formValues.dataType.inferEntities
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

                {/* Submit Button */}
                <div className='col-span-1 flex items-end'>
                    <button
                        type='submit'
                        disabled={isUploading}
                        className={`w-full btn flex items-center justify-center  ${
                            isUploading
                                ? 'opacity-50 cursor-not-allowed'
                                : hasErrors
                                  ? 'hover:bg-red-800 text-white'
                                  : 'text-white'
                        }`}
                        aria-label={isUploading ? 'Uploading file' : 'Upload file'}
                    >
                        {isUploading ? (
                            <>
                                <LoadingSpinner />
                                <span className='ml-2'>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className='mr-2 text-cradle2' />
                                Upload
                            </>
                        )}
                    </button>
                </div>
            </div>
            <AlertBox alert={alert} />
        </form>
    );
}

export default UploadForm;
