import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Yup from 'yup';
import { Upload, Eye, RefreshCircle, Trash } from 'iconoir-react';
import Selector from '../Selector/Selector';
import { queryEntries } from '../../services/queryService/queryService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import {
    getDigestTypes,
    saveDigest,
    getDigests,
    deleteDigest,
} from '../../services/intelioService/intelioService';
import Pagination from '../Pagination/Pagination';

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

function DigestCard({ localDigest, setAlert, onDelete }) {
    const [formattedDate, setFormattedDate] = useState('');
    const [visible, setVisible] = useState(true);
    const [showErrors, setShowErrors] = useState(false);
    const [showWarnings, setShowWarnings] = useState(false);

    useEffect(() => {
        setFormattedDate(new Date(localDigest.created_at).toLocaleString());
    }, [localDigest]);

    const handleDelete = async () => {
        try {
            await deleteDigest(localDigest.id);
            setVisible(false);
            setAlert({
                show: true,
                message: 'Digest deleted successfully',
                color: 'green',
            });
            if (onDelete) onDelete();
        } catch (error) {
            console.error('Delete digest failed:', error);
            setAlert({ show: true, message: 'Failed to delete digest', color: 'red' });
        }
    };

    if (!visible) return null;

    return (
        <div className='bg-white dark:bg-gray-800 dark:bg-opacity-75 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 m-2'>
            <div className='flex justify-between items-center mb-2'>
                <div className='flex items-center space-x-2'>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                        {localDigest.title}
                    </h2>
                    <button
                        title='Delete Digest'
                        className='text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors'
                        onClick={handleDelete}
                    >
                        <Trash className='w-5 h-5' />
                    </button>
                </div>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        localDigest.status === 'done'
                            ? 'bg-green-500 text-white'
                            : localDigest.status === 'failed'
                              ? 'bg-red-500 text-white'
                              : 'bg-yellow-500 text-white'
                    }`}
                >
                    {localDigest.status.charAt(0).toUpperCase() +
                        localDigest.status.slice(1)}
                </span>
            </div>
            <div className='text-gray-700 dark:text-gray-300 text-sm space-y-1'>
                <p>
                    <strong>Type:</strong> {localDigest.display_name}
                </p>
                {localDigest.entity_detail && (
                    <p>
                        <strong>Entity:</strong> {localDigest.entity_detail.subtype}:
                        {localDigest.entity_detail.name}
                    </p>
                )}
                <p>
                    <strong>User:</strong> {localDigest.user_detail.username}
                </p>
                <p>
                    <strong>Created On:</strong> {formattedDate}
                </p>
                {localDigest.num_relations > 0 && (
                    <p>
                        <strong>Relations:</strong> {localDigest.num_relations}
                    </p>
                )}
                {localDigest.num_notes > 0 && (
                    <p>
                        <strong>Notes:</strong> {localDigest.num_notes}
                    </p>
                )}
                {localDigest.num_files > 0 && (
                    <p>
                        <strong>Files:</strong> {localDigest.num_files}
                    </p>
                )}

                {localDigest.errors && localDigest.errors.length > 0 && (
                    <div className='mt-2'>
                        <button
                            className='flex items-center w-full text-left text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200 transition-colors'
                            onClick={() => setShowErrors(!showErrors)}
                        >
                            <span
                                className={`mr-2 transform transition-transform duration-200 ${
                                    showErrors ? 'rotate-90' : ''
                                }`}
                            >
                                ▶
                            </span>

                            <strong className='mr-2'>
                                Errors: {localDigest.errors.length}
                            </strong>
                        </button>
                        {showErrors && (
                            <ul className='list-disc pl-5 text-red-700 dark:text-red-300 mt-1'>
                                {localDigest.errors.map((error, index) => (
                                    <li key={`error-${index}`}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {localDigest.warnings && localDigest.warnings.length > 0 && (
                    <div className='mt-2'>
                        <button
                            onClick={() => setShowWarnings(!showWarnings)}
                            className='flex items-center text-yellow-600 dark:text-yellow-300 hover:text-yellow-500 dark:hover:text-yellow-200 transition-colors'
                        >
                            <span
                                className={`mr-2 transform transition-transform duration-200 ${
                                    showWarnings ? 'rotate-90' : ''
                                }`}
                            >
                                ▶
                            </span>
                            <strong className='mr-2'>
                                Warnings: {localDigest.warnings.length}
                            </strong>
                        </button>
                        {showWarnings && (
                            <ul className='list-disc pl-5 text-yellow-600 dark:text-yellow-300 mt-1'>
                                {localDigest.warnings.map((warning, index) => (
                                    <li key={`warning-${index}`}>{warning}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UploadExternal({ setAlert }) {
    const [dataTypeOptions, setDataTypeOptions] = useState([]);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Manage form state
    const [formValues, setFormValues] = useState({
        title: '',
        dataType: null,
        associatedEntry: [],
        files: [],
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Digest list state
    const [digests, setDigests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        getDigestTypes()
            .then((response) => {
                if (response.status === 200) {
                    const dataTypes = response.data.map((type) => ({
                        value: type.class,
                        label: type.name,
                        inferEntities: type.infer_entities,
                    }));
                    setDataTypeOptions(dataTypes);
                } else {
                    setAlert({
                        color: 'red',
                        message: 'Failed to load data types',
                        show: true,
                    });
                }
            })
            .catch((error) => {
                setAlert({
                    color: 'red',
                    message: `Error fetching data types: ${error.message}`,
                    show: true,
                });
            });

        // Initial fetch of digests
        fetchDigests();
    }, [page]);

    const fetchDigests = async () => {
        setLoading(true);
        try {
            const response = await getDigests(page);
            setDigests(response.data.results);
            setTotalPages(response.data.total_pages);
        } catch (error) {
            console.error('Failed to fetch digests', error);
            setAlert({
                color: 'red',
                message: `Error fetching digests: ${error.message}`,
                show: true,
            });
            setDigests([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const fetchRelatedEntries = async (query) => {
        setEntriesLoading(true);
        try {
            const response = await queryEntries({ name: `${query}`, type: 'entity' });
            if (response.status === 200) {
                const entries = response.data.results.map((entry) => ({
                    value: entry.id,
                    label: `${entry.subtype}:${entry.name}`,
                }));
                return entries;
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

    const handleUpload = async (values) => {
        setIsUploading(true);
        try {
            const body = {
                digest_type: values.dataType.value,
                title: values.title,
            };

            if (values.associatedEntry?.value)
                body.entity = values.associatedEntry?.value;

            const response = await saveDigest(body, values.files);

            if (response.status === 201) {
                setAlert({
                    color: 'green',
                    message: 'File uploaded successfully',
                    show: true,
                });
                // Reset form state on success
                setFormValues({
                    title: '',
                    dataType: null,
                    associatedEntry: [],
                    files: [],
                });
                setTouched({});
                setErrors({});
                // Refresh the digest list
                fetchDigests();
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
            console.log(errors);
            setErrors(formErrors);
            return false;
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        // Mark all fields as touched
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

    const handleDataTypeChange = (value) => {
        console.log(value);
        setFormValues((prev) => ({
            ...prev,
            dataType: value,
            // Clear associated entries if inferEntities is true
            associatedEntry: value && value.inferEntities ? [] : prev.associatedEntry,
        }));
        setTouched((prev) => ({ ...prev, dataType: true }));
    };

    const handleAssociatedEntriesChange = (value) => {
        setFormValues((prev) => ({
            ...prev,
            associatedEntry: value,
        }));
        setTouched((prev) => ({ ...prev, associatedEntry: true }));
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFormValues((prev) => ({ ...prev, files: [acceptedFiles[0]] }));
            setTouched((prev) => ({ ...prev, files: true }));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {},
        maxFiles: 1,
    });

    const removeFile = () => {
        setFormValues((prev) => ({ ...prev, files: [] }));
        setTouched((prev) => ({ ...prev, files: true }));
    };

    // Determine if the form is valid (used to disable the submit button)
    let isValid = false;
    try {
        UploadSchema.validateSync(formValues, { abortEarly: false });
        isValid = true;
    } catch (err) {
        isValid = false;
    }

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className=''>
                <h2 className='text-xl font-semibold mb-4'>Upload External Data</h2>

                <form onSubmit={onSubmit}>
                    <div className='grid grid-cols-5 gap-4 mb-4'>
                        {/* Digest Title Field */}
                        <div className='col-span-1'>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Digest Title
                            </label>
                            <input
                                type='text'
                                value={formValues.title}
                                onChange={(e) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                    }))
                                }
                                className='w-full input input-block'
                            />
                            {touched.title && errors.title && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        {/* Data Type Selector */}
                        <div className='col-span-1'>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Data Type
                            </label>
                            <Selector
                                value={formValues.dataType}
                                onChange={handleDataTypeChange}
                                staticOptions={dataTypeOptions}
                                placeholder='Select digest type'
                                className='w-full'
                                isMulti={false}
                            />
                            {touched.dataType && errors.dataType && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.dataType}
                                </p>
                            )}
                        </div>

                        {/* File Upload Area */}
                        <div className='col-span-1'>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Upload File
                            </label>
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-md p-2 text-center cursor-pointer h-10 flex items-center justify-center ${
                                    isDragActive
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'border-gray-300 hover:border-blue-400'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <p className='text-sm text-gray-500 truncate'>
                                    {formValues.files.length > 0
                                        ? `${formValues.files[0].name} (${(
                                              formValues.files[0].size / 1024
                                          ).toFixed(1)} KB)`
                                        : isDragActive
                                          ? 'Drop file here'
                                          : 'Drag file or click'}
                                </p>
                            </div>
                            {touched.files && errors.files && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.files}
                                </p>
                            )}
                        </div>

                        {/* Associated Entries Selector */}
                        <div className='col-span-1'>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Associated Entries
                            </label>
                            <Selector
                                value={formValues.associatedEntry}
                                onChange={handleAssociatedEntriesChange}
                                fetchOptions={fetchRelatedEntries}
                                isLoading={entriesLoading}
                                isMulti={true}
                                placeholder={
                                    'Select entries' +
                                    (formValues.dataType?.inferEntities
                                        ? ' (disabled)'
                                        : '')
                                }
                                className='w-full'
                                isDisabled={
                                    !formValues.dataType ||
                                    formValues.dataType.inferEntities
                                }
                            />
                            {touched.associatedEntry && errors.associatedEntry && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.associatedEntry}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className='col-span-1 flex items-end'>
                            <button
                                type='submit'
                                disabled={isUploading}
                                className={`w-full btn flex items-center justify-center ${
                                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className='mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin'></div>
                                        Uploading...
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
                </form>

                {/* Digest List Section */}
                <div className='mt-8'>
                    {loading ? (
                        <p className='text-gray-400'>Loading digests...</p>
                    ) : digests.length > 0 ? (
                        <>
                            {digests.map((digest) => (
                                <DigestCard
                                    key={digest.id}
                                    localDigest={digest}
                                    setAlert={setAlert}
                                    onDelete={fetchDigests}
                                    onRetry={fetchDigests}
                                />
                            ))}
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </>
                    ) : (
                        <p className='text-gray-400'>No previous uploads found.</p>
                    )}
                </div>
            </div>
        </>
    );
}
