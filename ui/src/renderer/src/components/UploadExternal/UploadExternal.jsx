import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Upload, X, Plus, CloudUpload } from 'iconoir-react';
import Selector from '../Selector/Selector';
import { advancedQuery } from '../../services/queryService/queryService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

const UploadSchema = Yup.object().shape({
    dataType: Yup.object()
        .shape({
            value: Yup.string().required('Data type is required'),
            label: Yup.string().required(),
        })
        .required('Please select a data type'),
    associatedEntries: Yup.array()
        .of(
            Yup.object().shape({
                value: Yup.string().required(),
                label: Yup.string().required(),
            }),
        )
        .min(1, 'Please select at least one associated entry'),
    files: Yup.array()
        .min(1, 'Please upload at least one file')
        .required('Files are required'),
});

export default function UploadExternal({ onUploadComplete, setAlert }) {
    // State for storing fetched data types
    const [dataTypesLoading, setDataTypesLoading] = useState(false);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch data types from API
    const fetchDataTypes = async (query) => {
        setDataTypesLoading(true);
        try {
            // Replace with your actual API call to fetch data types
            const response = await advancedQuery(`type:${query}`, true);

            if (response.status === 200) {
                const dataTypes = response.data.results.map((type) => ({
                    value: type.id,
                    label: type.name || type.id,
                }));
                return dataTypes;
            } else {
                setAlert({
                    type: 'error',
                    message: 'Failed to load data types',
                    show: true,
                });
                return [];
            }
        } catch (error) {
            setAlert({
                type: 'error',
                message: `Error fetching data types: ${error.message}`,
                show: true,
            });
            return [];
        } finally {
            setDataTypesLoading(false);
        }
    };

    // Fetch related entries based on selected data type
    const fetchRelatedEntries = async (query) => {
        try {
            const response = await advancedQuery(`${selectedType}:${query}`, true);

            if (response.status === 200) {
                const entries = response.data.results.map((entry) => ({
                    value: entry.id,
                    label: `${entry.name || entry.id}`,
                }));
                return entries;
            } else {
                setAlert({
                    type: 'error',
                    message: 'Failed to load associated entries',
                    show: true,
                });
                return [];
            }
        } catch (error) {
            setAlert({
                type: 'error',
                message: `Error fetching entries: ${error.message}`,
                show: true,
            });
            return [];
        } finally {
            setEntriesLoading(false);
        }
    };

    // Handle file upload
    const handleUpload = async (values) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();

            // Add data type
            formData.append('dataType', values.dataType.value);

            // Add associated entries
            values.associatedEntries.forEach((entry) => {
                formData.append('associatedEntries', entry.value);
            });

            // Add files
            values.files.forEach((file) => {
                formData.append('files', file);
            });

            // Simulate upload progress
            const uploadInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    const newProgress = prev + 10;
                    if (newProgress >= 100) {
                        clearInterval(uploadInterval);
                        return 100;
                    }
                    return newProgress;
                });
            }, 300);

            // Replace with your actual upload API call
            // const response = await uploadFiles(formData, (progress) => {
            //   setUploadProgress(progress);
            // });

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 3000));

            clearInterval(uploadInterval);
            setUploadProgress(100);

            // Reset form after successful upload
            formik.resetForm();

            setAlert({
                type: 'success',
                message: 'Files uploaded successfully',
                show: true,
            });

            if (onUploadComplete) {
                onUploadComplete({
                    dataType: values.dataType,
                    associatedEntries: values.associatedEntries,
                    fileCount: values.files.length,
                });
            }
        } catch (error) {
            setAlert({
                type: 'error',
                message: `Upload failed: ${error.message}`,
                show: true,
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Initialize formik
    const formik = useFormik({
        initialValues: {
            dataType: null,
            associatedEntries: [],
            files: [],
        },
        validationSchema: UploadSchema,
        onSubmit: handleUpload,
    });

    // Configure dropzone
    const onDrop = useCallback(
        (acceptedFiles) => {
            formik.setFieldValue('files', [...formik.values.files, ...acceptedFiles]);
        },
        [formik.values.files, formik.setFieldValue],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {},
    });

    // Remove a file from the list
    const removeFile = (index) => {
        const newFiles = [...formik.values.files];
        newFiles.splice(index, 1);
        formik.setFieldValue('files', newFiles);
    };

    return (
        <div className='p-8'>
            <h2 className='text-xl font-semibold mb-4'>Upload External Data</h2>

            <form onSubmit={formik.handleSubmit}>
                <div className='grid grid-cols-4 gap-4 mb-4'>
                    {/* Data Type Selector */}
                    <div className='col-span-1'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Data Type
                        </label>
                        <Selector
                            value={formik.values.dataType}
                            onChange={(value) =>
                                formik.setFieldValue('dataType', value)
                            }
                            fetchOptions={fetchDataTypes}
                            isLoading={dataTypesLoading}
                            placeholder='Select data type'
                            className='w-full'
                            isMulti={false}
                        />
                        {formik.touched.dataType && formik.errors.dataType && (
                            <p className='mt-1 text-xs text-red-600'>
                                {formik.errors.dataType}
                            </p>
                        )}
                    </div>

                    {/* File Upload Area */}
                    <div className='col-span-1'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Upload Files
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
                                {isDragActive
                                    ? 'Drop files here'
                                    : 'Drag files or click'}
                            </p>
                        </div>
                        {formik.touched.files && formik.errors.files && (
                            <p className='mt-1 text-xs text-red-600'>
                                {formik.errors.files}
                            </p>
                        )}
                    </div>

                    {/* Associated Entries Selector */}
                    <div className='col-span-1'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Associated Entries
                        </label>
                        <Selector
                            value={formik.values.associatedEntries}
                            onChange={(value) =>
                                formik.setFieldValue('associatedEntries', value)
                            }
                            fetchOptions={fetchRelatedEntries}
                            isLoading={entriesLoading}
                            placeholder='Select entries'
                            className='w-full'
                            isMulti={true}
                            isDisabled={!formik.values.dataType}
                        />
                        {formik.touched.associatedEntries &&
                            formik.errors.associatedEntries && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {formik.errors.associatedEntries}
                                </p>
                            )}
                    </div>

                    {/* Submit Button */}
                    <div className='col-span-1 flex items-end'>
                        <button
                            type='submit'
                            disabled={isUploading || !formik.isValid}
                            className={`w-full btn flex items-center justify-center ${
                                isUploading || !formik.isValid
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                            }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className='mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin'></div>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className='mr-2' size={18} />
                                    Upload
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* File List */}
                {formik.values.files.length > 0 && (
                    <div className='mt-4'>
                        <h3 className='text-sm font-medium text-gray-700 mb-2'>
                            Selected Files
                        </h3>
                        <div className='space-y-2 max-h-40 overflow-y-auto'>
                            {formik.values.files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className='flex items-center justify-between bg-gray-50 p-2 rounded'
                                >
                                    <div className='flex items-center'>
                                        <CloudUpload />
                                        <span className='text-sm truncate max-w-md'>
                                            {file.name}
                                        </span>
                                        <span className='text-xs text-gray-500 ml-2'>
                                            ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() => removeFile(index)}
                                        className='text-red-500 hover:text-red-700'
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                    <div className='mt-4'>
                        <div className='flex justify-between text-xs text-gray-600 mb-1'>
                            <span>Upload Progress</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className='w-full bg-gray-200 rounded-full h-2'>
                            <div
                                className='bg-blue-600 h-2 rounded-full'
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
