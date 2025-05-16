import { useEffect, useState } from 'react';
import { getFiles } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Pagination from '../Pagination/Pagination';
import { Search, Download } from 'iconoir-react';
import { createDownloadPath } from '../../utils/textEditorUtils/textEditorUtils';
import { authAxios, noAuthAxios } from '../../services/axiosInstance/axiosInstance';

/**
 * Files component
 * Displays files related to an artifact
 * Uses the /notes/files/ endpoint to fetch files
 *
 * @param {Object} props
 * @param {Object} props.obj - The artifact object
 * @param {Function} props.setAlert - Function to set alert messages
 * @returns {JSX.Element}
 */
export default function Files({ obj, setAlert }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(Number(searchParams.get('page_files')) || 1);
    const [searchFilters, setSearchFilters] = useState({
        ['linked_to']: obj.id,
        keyword: '',
        mimetype: '',
    });
    const [exactMatch, setExactMatch] = useState(false);
    const navigate = useNavigate();

    const fetchFiles = () => {
        if (!obj?.id) return;

        setLoading(true);
        const params = {
            page,
            ...searchFilters,
            linked_to_exact_match: exactMatch,
        };

        getFiles(params)
            .then((response) => {
                if (response.status === 200) {
                    setFiles(response.data.results);
                    setTotalPages(response.data.total_pages);
                }
            })
            .catch((error) => {
                displayError(setAlert, navigate)(error);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        setPage(Number(searchParams.get('page_files')) || 1);
        fetchFiles();
    }, [page, searchFilters, exactMatch, obj?.id]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page_files', newPage);
        setSearchParams(newParams);
        setPage(newPage);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchFiles();
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    const downloadFile = (bucket_name, minio_file_name) => {
        const url = createDownloadPath({bucket_name, minio_file_name});
        authAxios.get(url).then((response) => {
                const { presigned } = response.data;
                const link = document.createElement('a');
                link.href = presigned;

                const fileName = minio_file_name.split('/').pop() || minio_file_name;
                link.download = fileName;
                document.body.appendChild(link);

                link.click();

                document.body.removeChild(link);
            });
        }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="bg-cradle3 bg-opacity-20 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl mb-4">
            <div className="p-4">
                <form onSubmit={handleSearchSubmit} className="flex space-x-4">
                    <input
                        type="text"
                        name="keyword"
                        value={searchFilters.keyword}
                        onChange={handleSearchChange}
                        placeholder="Search by name or hash"
                        className="input input-block"
                    />
                    <input
                        type="text"
                        name="mimetype"
                        value={searchFilters.mimetype}
                        onChange={handleSearchChange}
                        placeholder="Search by mimetype"
                        className="input input-block"
                    />
                    <div className="flex items-center space-x-2">
                        <button type="submit" className="btn">
                            <Search /> Search
                        </button>
                        {obj.type == 'entity' &&
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="exactMatch"
                                name="exactMatch"
                                className="switch switch-ghost-primary h-5 w-14"
                                checked={exactMatch}
                                onChange={(e) => setExactMatch(e.target.checked)}
                            />
                            <label htmlFor="exactMatch" className="ml-2 text-sm">Exact match</label>
                        </div>}
                    </div>
                </form>
            </div>
            <div className="flex-1 overflow-y-auto">
            {!loading && files.length > 0 && (
                <div className="mt-4">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="spinner-dot-pulse spinner-xl">
                            <div className="spinner-pulse-dot"></div>
                        </div>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                        No files found for this artifact.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 p-4">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="relative h-fit w-full bg-cradle3 px-3 py-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl my-2 flex items-center"
                            >
                                <div className="flex-grow">
                                    <h2 className="card-header w-full mx-2 dark:text-white">{file.file_name}</h2>
                                    <a
                                        href={`/notes/${file.note_id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/notes/${file.note_id}`);
                                        }}
                                        className="text-zinc-500 hover:text-zinc-600 mx-2"
                                    >
                                        View Note
                                    </a>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                    <button
                                        onClick={() => downloadFile(file.bucket_name, file.minio_file_name)}
                                        className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                                    >
                                        <Download />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!loading && files.length > 0 && (
                <div className="mt-4">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}
            </div>
        </div>
    );
}
