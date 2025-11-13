import { Code, Download, Page } from 'iconoir-react';
import React, { useState } from 'react';
import useApi from '@/hooks/useApi/useApi';
import { displayError } from '@/utils/responseUtils/responseUtils';

const ReportGenerationModal = ({ closeModal, noteId, noteTitle, setAlert }) => {
    const { reportsApi } = useApi();
    const [title, setTitle] = useState(noteTitle || '');
    const [format, setFormat] = useState('html');
    const [mode, setMode] = useState('anonymized');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!title.trim()) {
            setAlert({
                show: true,
                message: 'Please enter a report title.',
                color: 'red',
            });
            return;
        }

        setIsGenerating(true);
        try {
            await reportsApi.reportsPublishCreate({
                publishReportRequest: {
                    strategy: format,
                    noteIds: [noteId],
                    title: title.trim(),
                    anonymized: mode === 'anonymized'
                }
            });

            setAlert({
                show: true,
                message: 'Report generated successfully!',
                color: 'green',
            });
            closeModal();
        } catch (error) {
            displayError(setAlert)(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        < div className="p-2 space-y-6" >
            {/* Title Input */}
            < div >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Report Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cradle2 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter report title..."
                    disabled={isGenerating}
                />
            </div >

            {/* Format Selection */}
            < div >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setFormat('html')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${format === 'html'
                            ? 'border-cradle2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-cradle2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } disabled:opacity-50`}
                    >
                        <Page width="20" height="20" />
                        <span className="text-sm font-medium">HTML</span>
                    </button>
                    <button
                        onClick={() => setFormat('json')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${format === 'json'
                            ? 'border-cradle2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-cradle2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } disabled:opacity-50`}
                    >
                        <Code width="20" height="20" />
                        <span className="text-sm font-medium">JSON</span>
                    </button>
                    <button
                        onClick={() => setFormat('plain')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${format === 'plain'
                            ? 'border-cradle2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-cradle2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } disabled:opacity-50`}
                    >
                        <Download width="20" height="20" />
                        <span className="text-sm font-medium">Plain Text</span>
                    </button>
                </div>
            </div >

            {/* Mode Selection */}
            < div >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setMode('anonymized')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'anonymized'
                            ? 'border-cradle2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-cradle2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } disabled:opacity-50`}
                    >
                        <span className="text-sm font-medium">Anonymized</span>
                    </button>
                    <button
                        onClick={() => setMode('transparent')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'transparent'
                            ? 'border-cradle2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-cradle2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            } disabled:opacity-50`}
                    >
                        <span className="text-sm font-medium">Transparent</span>
                    </button>
                </div>
            </div >

            {/* Footer */}
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={closeModal}
                    disabled={isGenerating}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !title.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cradle2 border border-transparent rounded-md hover:bg-cradle2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isGenerating && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                </button>
            </div>
        </div >
    );
};

export default ReportGenerationModal;
