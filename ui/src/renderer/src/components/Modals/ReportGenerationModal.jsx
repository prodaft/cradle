import React, { useState } from 'react';
import { X, Page, Code, Download } from 'iconoir-react';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import { displayError } from '../../utils/responseUtils/responseUtils';

const ReportGenerationModal = ({ isOpen, onClose, noteId, noteTitle, setAlert }) => {
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
            const response = await authAxios.post('/reports/publish/', {
                strategy: format,
                note_ids: [noteId],
                title: title.trim(),
                anonymized: mode === 'anonymized'
            });

            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Report generated successfully!',
                    color: 'green',
                });
                onClose();
            }
        } catch (error) {
            displayError(setAlert)(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        if (!isGenerating) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Create Report
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={isGenerating}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    >
                        <X width="20" height="20" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Report Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter report title..."
                            disabled={isGenerating}
                        />
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Format
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setFormat('html')}
                                disabled={isGenerating}
                                className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                                    format === 'html'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                } disabled:opacity-50`}
                            >
                                <Page width="20" height="20" />
                                <span className="text-sm font-medium">HTML</span>
                            </button>
                            <button
                                onClick={() => setFormat('json')}
                                disabled={isGenerating}
                                className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                                    format === 'json'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                } disabled:opacity-50`}
                            >
                                <Code width="20" height="20" />
                                <span className="text-sm font-medium">JSON</span>
                            </button>
                            <button
                                onClick={() => setFormat('plain')}
                                disabled={isGenerating}
                                className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                                    format === 'plain'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                } disabled:opacity-50`}
                            >
                                <Download width="20" height="20" />
                                <span className="text-sm font-medium">Plain Text</span>
                            </button>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMode('anonymized')}
                                disabled={isGenerating}
                                className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                    mode === 'anonymized'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                } disabled:opacity-50`}
                            >
                                <span className="text-sm font-medium">Anonymized</span>
                            </button>
                            <button
                                onClick={() => setMode('transparent')}
                                disabled={isGenerating}
                                className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                                    mode === 'transparent'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                } disabled:opacity-50`}
                            >
                                <span className="text-sm font-medium">Transparent</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !title.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportGenerationModal;
