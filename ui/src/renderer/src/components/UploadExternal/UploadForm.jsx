import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'iconoir-react';
import Selector from '../Selector/Selector';
import UploadSchema from './UploadSchema';
import { queryEntries } from '../../services/queryService/queryService';

function UploadForm({
    formValues,
    setFormValues,
    errors,
    setErrors,
    touched,
    setTouched,
    onSubmit,
    dataTypeOptions,
    isUploading,
    setAlert,
}) {
    const [entriesLoading, setEntriesLoading] = useState(false);

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

    const handleDataTypeChange = (value) => {
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

    const onDrop = useCallback(
        (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setFormValues((prev) => ({ ...prev, files: [acceptedFiles[0]] }));
                setTouched((prev) => ({ ...prev, files: true }));
            }
        },
        [setFormValues, setTouched],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {},
        maxFiles: 1,
    });

    // Determine if the form is valid (used to disable the submit button)
    let isValid = false;
    try {
        UploadSchema.validateSync(formValues, { abortEarly: false });
        isValid = true;
    } catch (err) {
        isValid = false;
    }

    return (
        <form onSubmit={onSubmit}>
            <div className='grid grid-cols-5 gap-4 mb-4 px-4'>
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
                        <p className='mt-1 text-xs text-red-600'>{errors.title}</p>
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
                        <p className='mt-1 text-xs text-red-600'>{errors.dataType}</p>
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
                        <p className='mt-1 text-xs text-red-600'>{errors.files}</p>
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
                            (formValues.dataType?.inferEntities ? ' (disabled)' : '')
                        }
                        className='w-full'
                        isDisabled={
                            !formValues.dataType || formValues.dataType.inferEntities
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
    );
}

export default UploadForm;
