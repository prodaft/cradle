import React, { useEffect, useRef, useState } from 'react';
import { uploadFile } from '../../services/fileUploadService/fileUploadService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function FileInput() {
    const emptyFileList = new DataTransfer().files;
    const [files, setFiles] = useState(emptyFileList);
    const auth = useAuth();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current.files = files;
    }, [files]);

    const handleFileChange = (event) => {
        if (event && event.target && event.target.files) {
            setFiles(event.target.files);
        }
        else {
            setFiles(emptyFileList);
        }
    };

    const handleUpload = () => {
        if (!files || files.length === 0) {
            setAlert("No files selected.");
            setAlertColor("red");
            return;
        }

        // Attempt to upload all files. All files that fail the upload will remain in the file input.
        setIsUploading(true);
        const failed = new DataTransfer();
        const fileUploadPromises = Array.from(files).map(file => uploadFile(auth.access, file)
            .catch(() => {
                failed.items.add(file);
            })
        );
        // Handle all the failures by alerting the user which uploads failed
        Promise.all(fileUploadPromises)
            .then(() => {
                if (failed.files.length > 0) {
                    setFiles(failed.files);
                    throw new Error("Failed to upload some files: " +
                        Array.from(failed.files).map(file => file.name).join(", "));
                } else {
                    setFiles(emptyFileList);
                    setAlert("All files uploaded successfully!");
                    setAlertColor("green");
                }
            })
            .catch(displayError(setAlert, setAlertColor)) // Catches the error thrown in the .then block as well
            .finally(() => {
                setIsUploading(false);
            });
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className='flex flex-row space-x-2'>
                <input
                    type="file"
                    className={`input-file input-file-sm ${files.length > 0 && "input-file-primary"} hover:border-cradle2`}
                    multiple
                    onChange={handleFileChange}
                    ref={inputRef}
                />
                <button
                    className={`btn btn-sm ${isUploading && "btn-loading"}`}
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                >
                    Upload
                </button>
            </div >
        </>
    );
};
