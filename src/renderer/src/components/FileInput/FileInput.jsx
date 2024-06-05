import React, { useState } from 'react';
import { uploadFile } from '../../services/fileUploadService/fileUploadService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { CloudUpload } from 'iconoir-react/regular';
import NavbarButton from '../NavbarButton/NavbarButton';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function FileInput() {
    const [files, setFiles] = useState([]);
    const auth = useAuth();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");

    const handleFileChange = (event) => {
        if (event && event.target && event.target.files) {
            setFiles(Array.from(event.target.files));
            console.log("Files", Array.from(event.target.files));
        }
        else {
            setFiles([]);
        }
    };

    const handleUpload = () => {
        if (!files || files.length === 0) {
            setAlert("No files selected.");
            setAlertColor("red");
            return;
        }

        const fileUploadPromises = files.map(file => uploadFile(auth.access, file));
        Promise.all(fileUploadPromises)
            .then(() => {
                setAlert("All files uploaded successfully!");
                setAlertColor("green");
            })
            .catch(displayError(setAlert, setAlertColor));
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className='flex flex-row space-x-2'>
                <input type="file" className={`input-file input-file-sm ${files.length > 0 && "input-file-primary"} hover:border-cradle2`} multiple onChange={handleFileChange} />
                {files.length !== 0 && <button
                    className='btn btn-sm btn-ghost-primary'
                    onClick={handleUpload}
                    disabled={files.length === 0}
                >
                    {/* <CloudUpload /> */}
                    Upload
                </button>}
            </div >
        </>
    );
};
