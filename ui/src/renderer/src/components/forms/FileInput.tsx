import { CloudUpload } from 'iconoir-react';
import { ChangeEvent, ClipboardEvent, Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useNotif } from '@contexts/ui';
import { useApi, useCradleNavigate } from '@hooks';
import { uploadFile } from '@utils/files';
import { handleAPIError } from '@utils/api';
import type { FileReference } from '@/services/cradle/models';

/**
 * FileInput component props
 */
export interface FileInputProps {
  /** Files uploaded via this instance of the component */
  fileData: FileReference[];
  /** Callback used when uploaded files change */
  setFileData: Dispatch<SetStateAction<FileReference[]>>;
  /** Array of File objects pending upload */
  pendingFiles: File[];
  /** Callback used when pending files change */
  setPendingFiles: Dispatch<SetStateAction<File[]>>;
}

/**
 * This component is used to upload files to the server.
 * It has an input field for selecting files and a button to upload them.
 *
 * The user can upload multiple files at once. Each file is uploaded individually.
 * If any of the files fail to upload, the user is alerted.
 *
 * @example
 * ```tsx
 * const [fileData, setFileData] = useState<FileReference[]>([]);
 * const [pendingFiles, setPendingFiles] = useState<File[]>([]);
 *
 * <FileInput
 *   fileData={fileData}
 *   setFileData={setFileData}
 *   pendingFiles={pendingFiles}
 *   setPendingFiles={setPendingFiles}
 * />
 * ```
 */
export default function FileInput({
  fileData,
  setFileData,
  pendingFiles,
  setPendingFiles,
}: FileInputProps): JSX.Element {
  const { fileTransferApi } = useApi();
  const { notify } = useNotif();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate, navigateLink } = useCradleNavigate();

  // Update the file input's files when pendingFiles changes
  useEffect(() => {
    if (inputRef.current && pendingFiles.length > 0) {
      // Create a new DataTransfer object to convert the array back to a FileList
      const dataTransfer = new DataTransfer();
      pendingFiles.forEach((file) => dataTransfer.items.add(file));
      inputRef.current.files = dataTransfer.files;
    } else if (inputRef.current) {
      // Clear the input
      inputRef.current.value = '';
    }
  }, [pendingFiles]);

  const handleUpload = () => {
    if (!pendingFiles || pendingFiles.length === 0) {
      notify({ type: 'error', text: 'No files selected.' });
      return;
    }

    // Attempt to upload all files and remember which files succeed and which fail
    setIsUploading(true);
    const succeededFileData: FileReference[] = [];
    const failedFiles: File[] = [];

    const fileUploadPromises = pendingFiles.map((file) =>
      fileTransferApi.fileTransferUploadRetrieve({ fileName: file.name })
        .then(async (res) => {
          const uploadUrl = res.presigned;
          await uploadFile(uploadUrl, file);
          return res;
        })
        .then((data) => {
          succeededFileData.push({
            minioFileName: data.minioFileName,
            fileName: file.name,
            bucketName: data.bucketName,
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
          notify({
            type: 'success',
            text: 'All files uploaded successfully!',
          });
        }
      })
      .catch((error) => {
        handleAPIError(error, notify);
      }) // Catches the error thrown in the .then block
      .finally(() => {
        setIsUploading(false);
      });
  };

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target && event.target.files && event.target.files.length > 0) {
        // Convert FileList to Array to ensure consistency across browsers
        setPendingFiles(Array.from(event.target.files));
      } else {
        setPendingFiles([]);
      }
    },
    [setPendingFiles],
  );

  // Handle paste events (for the editor component issue)
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        // Immediately convert FileList to Array
        setPendingFiles(Array.from(e.clipboardData.files));
      }
    },
    [setPendingFiles],
  );

  return (
    <>
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
