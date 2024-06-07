import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getUploadLink, uploadFile } from '../../services/fileUploadService/fileUploadService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { CloudUpload } from 'iconoir-react';

/**
 * This component is used to upload files to the server.
 * It has an input field for selecting files and a button to upload them.
 * 
 * The user can upload multiple files at once. Each file is uploaded individually. 
 * If any of the files fail to upload, the user is alerted.
 * 
 * @param {Array<Object>} fileData - the files uploaded via this instance of the component. This only contains the tag and the name of the file.
 *                                   The tag is a unique identifier used to reference the file in the markdown content.
 * @param {(FileList) => void} setFileData - callback used when the files uploaded via this instance of the component change
 * @returns {FileInput}
 * @constructor
 */
export default function FileInput({ fileData, setFileData }) {
    const EMPTY_FILE_LIST = new DataTransfer().files;
    const [pendingFiles, setPendingFiles] = useState(EMPTY_FILE_LIST);
    const auth = useAuth();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current.files = pendingFiles;
    }, [pendingFiles]);

    const handleUpload = () => {
        if (!pendingFiles || pendingFiles.length === 0) {
            setAlert("No files selected.");
            setAlertColor("red");
            return;
        }

        // Attempt to upload all files and remember which files succeed and which fail
        setIsUploading(true);
        const succeededFileData = new Array();
        const failedFiles = new DataTransfer();
        const fileUploadPromises = Array.from(pendingFiles).map(file => getUploadLink(auth.access, file.name)
            .then(async (res) => {
                const uploadUrl = res.data.presigned;
                const tag = res.data.minio_file_name;
                console.log(res.data)
                await uploadFile(uploadUrl, file);
                return tag;
            })
            .then((tag) => {
                succeededFileData.push({
                    tag: tag,
                    name: file.name,
                })
            })
            .catch(() => {
                failedFiles.items.add(file);
            })
        );
        // Handle all the failures by alerting the user which uploads failed
        Promise.all(fileUploadPromises)
            .then(() => {
                // Add the files that succeeded to the list of files
                console.log("file data", fileData)
                console.log("succeeded", succeededFileData)
                const concatFileData = fileData.concat(succeededFileData);
                setFileData(concatFileData);
            })
            .then(() => {
                // All other files are kept in the input fields and the user is alerted
                if (failedFiles.files.length > 0) {
                    setPendingFiles(failedFiles.files);
                    throw new Error("Failed to upload files: "
                        + Array.from(failedFiles.files).map(file => file.name).join(", "));
                } else {
                    setPendingFiles(EMPTY_FILE_LIST);
                    setAlert("All files uploaded successfully!");
                    setAlertColor("green");
                }
            })
            .catch(displayError(setAlert, setAlertColor)) // Catches the error thrown in the .then block
            .finally(() => {
                setIsUploading(false);
            });
    };

    const handleFileChange = useCallback((event) => {
        if (event.target && event.target.files) {
            setPendingFiles(event.target.files);
        }
        else {
            setPendingFiles(EMPTY_FILE_LIST);
        }
    }, []);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className='flex flex-row space-x-2'>
                <input
                    type="file"
                    className={`input-file input-file-sm ${pendingFiles.length > 0 && "input-file-primary"} hover:border-cradle2`}
                    multiple
                    onChange={handleFileChange}
                    ref={inputRef}
                />
                <div className={`${(pendingFiles.length === 0) && "hover:cursor-not-allowed opacity-50"}`}>
                    <button
                        className={`btn btn-sm ${isUploading && "btn-loading"}`}
                        onClick={handleUpload}
                        disabled={isUploading || pendingFiles.length === 0}
                    >
                        <CloudUpload width={"25px"} />
                    </button>
                </div>
            </div >
        </>
    );
};
