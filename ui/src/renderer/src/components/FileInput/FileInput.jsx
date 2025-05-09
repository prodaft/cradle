import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    getUploadLink,
    uploadFile,
} from '../../services/fileUploadService/fileUploadService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { CloudUpload } from 'iconoir-react';
import { useNavigate } from 'react-router-dom';

/**
 * This component is used to upload files to the server.
 * It has an input field for selecting files and a button to upload them.
 *
 * The user can upload multiple files at once. Each file is uploaded individually.
 * If any of the files fail to upload, the user is alerted.
 *
 * @function FileInput
 * @param {Object} props - The props object
 * @param {Array<FileData>} props.fileData - the files uploaded via this instance of the component. This only contains the tag and the name of the file.
 * @param {StateSetter<Array<FileData>>} props.setFileData - callback used when the files uploaded via this instance of the component change
 * @param {Array<File>} props.pendingFiles - array of File objects pending upload
 * @param {StateSetter<Array<File>>} props.setPendingFiles - callback used when the pending files change
 * @returns {FileInput}
 * @constructor
 */
export default function FileInput({
    fileData,
    setFileData,
    pendingFiles,
    setPendingFiles,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Update the file input's files when pendingFiles changes
    useEffect(() => {
        if (inputRef.current && pendingFiles.length > 0) {
            // Create a new DataTransfer object to convert the array back to a FileList
            const dataTransfer = new DataTransfer();
            pendingFiles.forEach(file => dataTransfer.items.add(file));
            inputRef.current.files = dataTransfer.files;
        } else if (inputRef.current) {
            // Clear the input
            inputRef.current.value = '';
        }
    }, [pendingFiles]);

    const handleUpload = () => {
        if (!pendingFiles || pendingFiles.length === 0) {
            setAlert({ show: true, message: 'No files selected.', color: 'red' });
            return;
        }

        // Attempt to upload all files and remember which files succeed and which fail
        setIsUploading(true);
        const succeededFileData = [];
        const failedFiles = [];

        const fileUploadPromises = pendingFiles.map((file) =>
            getUploadLink(file.name)
                .then(async (res) => {
                    const uploadUrl = res.data.presigned;
                    await uploadFile(uploadUrl, file);
                    return res.data;
                })
                .then((data) => {
                    succeededFileData.push({
                        minio_file_name: data.minio_file_name,
                        file_name: file.name,
                        bucket_name: data.bucket_name,
                    });
                })
                .catch((err) => {
                    failedFiles.push(file);
                }),
        );

        // Handle all the failures by alerting the user which uploads failed
        Promise.all(fileUploadPromises)
            .then(() => {
                // Add the files that succeeded to the list of files
                setFileData(fileData.concat(succeededFileData));
            })
            .then(() => {
                // All other files are kept in the input fields and the user is alerted
                if (failedFiles.length > 0) {
                    setPendingFiles(failedFiles);
                    throw new Error(
                        'Failed to upload files: ' +
                            failedFiles.map((file) => file.name).join(', '),
                    );
                } else {
                    setPendingFiles([]);
                    setAlert({
                        show: true,
                        message: 'All files uploaded successfully!',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert, navigate)) // Catches the error thrown in the .then block
            .finally(() => {
                setIsUploading(false);
            });
    };

    const handleFileChange = useCallback((event) => {
        if (event.target && event.target.files && event.target.files.length > 0) {
            // Convert FileList to Array to ensure consistency across browsers
            setPendingFiles(Array.from(event.target.files));
        } else {
            setPendingFiles([]);
        }
    }, [setPendingFiles]);

    // Handle paste events (for the editor component issue)
    const handlePaste = useCallback((e) => {
        if (e.clipboardData && e.clipboardData.files.length > 0) {
            e.preventDefault();
            // Immediately convert FileList to Array
            setPendingFiles(Array.from(e.clipboardData.files));
        }
    }, [setPendingFiles]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='flex flex-row space-x-2' onPaste={handlePaste}>
                <input
                    type='file'
                    className={`input-file input-file-sm ${pendingFiles.length > 0 && 'input-file-primary'} hover:border-cradle2`}
                    multiple
                    onChange={handleFileChange}
                    ref={inputRef}
                />
                <div
                    className={`${pendingFiles.length === 0 && 'hover:cursor-not-allowed opacity-50'}`}
                >
                    <button
                        className={`btn btn-sm ${isUploading && 'btn-loading'}`}
                        onClick={handleUpload}
                        disabled={isUploading || pendingFiles.length === 0}
                    >
                        <CloudUpload width={'25px'} />
                    </button>
                </div>
            </div>
        </>
    );
}
