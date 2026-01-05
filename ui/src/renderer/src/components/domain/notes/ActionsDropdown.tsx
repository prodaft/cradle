import Tooltip from '@components/base/Tooltip/Tooltip';
import { Graph, TreeView } from '@phosphor-icons/react';
import {
    Box,
    Check,
    ClockRotateRight,
    CloudUpload,
    Code,
    InputOutput,
    MoreVert,
    Page,
    RefreshCircle,
    Search,
    Sparks,
    StatsReport
} from 'iconoir-react';
import { FloppyDisk, LightBulb, Trash } from 'iconoir-react/regular';
import { ViewMode } from './constants';

interface ActionsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    showActionsMenu: boolean;
    enableEditing: boolean;
    setShowActionsMenu: (show: boolean) => void;
    toggleEditing: () => void;
    setActiveView: (view: ViewMode) => void;
    setRichEditor: (rich: boolean) => void;
    showOutline: boolean;
    toggleOutline: () => void;
    lspLoaded: boolean;
    smartLink: (addTimestamps: boolean) => void;
    isAdmin: boolean;
    handleRelinkNote: () => void;
    isFleeting: boolean;
    hasFiles: boolean;
    handleSaveAsFinal: () => void;
    saving: boolean;
    handlePublish: () => void;
    handleDelete: () => void;
    handleUploadFiles: () => void;
    handleFind: () => void;
    handleReplace: () => void;
    enrichData: () => void;
}

/**
 * Dropdown menu for note actions (outline, auto link, upload, delete, etc.)
 */
export default function ActionsDropdown({
    activeView,
    richEditor,
    showActionsMenu,
    enableEditing,
    setShowActionsMenu,
    setActiveView,
    setRichEditor,
    showOutline,
    toggleOutline,
    lspLoaded,
    smartLink,
    isAdmin,
    handleRelinkNote,
    isFleeting,
    hasFiles,
    handleSaveAsFinal,
    saving,
    handlePublish,
    handleDelete,
    handleUploadFiles,
    handleFind,
    handleReplace,
    enrichData,
}: ActionsDropdownProps) {
    const menuButtonClasses =
        'w-full text-left px-4 py-2 text-sm cradle-text-secondary border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2';
    const destructiveMenuButtonClasses =
        'w-full text-left px-4 py-2 text-sm text-red-500 border border-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors rounded-lg flex items-center gap-2';

    return (
        <div className='relative'>
            <Tooltip content='Actions'>
                <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors cradle-border'
                    data-testid='actions-dropdown-btn'
                >
                    <MoreVert width='20' height='20' />
                </button>
            </Tooltip>
            {showActionsMenu && (
                <>
                    <div
                        className='fixed inset-0 z-10'
                        onClick={() => setShowActionsMenu(false)}
                    />
                    <div className='absolute right-0 mt-2 w-48 cradle-bg-elevated cradle-border z-20 rounded-xl overflow-hidden py-1 px-1'>
                        <div role='menu'>
                            {/* View / editor mode options */}
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                    setActiveView(ViewMode.CONTENT);
                                    setRichEditor(true);
                                }}
                                className={menuButtonClasses}
                                data-testid='rich-editor-menu-item'
                            >
                                <Page width='16' height='16' />
                                <span className='flex-1'>Rich Editor</span>
                                {activeView === ViewMode.CONTENT && richEditor && (
                                    <Check width='16' height='16' />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                    setActiveView(ViewMode.CONTENT);
                                    setRichEditor(false);
                                }}
                                className={menuButtonClasses}
                                data-testid='markdown-editor-menu-item'
                            >
                                <Code width='16' height='16' />
                                <span className='flex-1'>Source Editor</span>
                                {activeView === ViewMode.CONTENT && !richEditor && (
                                    <Check width='16' height='16' />
                                )}
                            </button>
                            {!isFleeting && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            setActiveView(ViewMode.GRAPH);
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='graph-view-menu-item'
                                    >
                                        <Graph width='16' height='16' />
                                        <span className='flex-1'>Graph</span>
                                        {activeView === ViewMode.GRAPH && (
                                            <Check width='16' height='16' />
                                        )}
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setShowActionsMenu(false);
                                                setActiveView(ViewMode.HISTORY);
                                            }}
                                            className={menuButtonClasses}
                                            data-testid='history-view-menu-item'
                                        >
                                            <ClockRotateRight width='16' height='16' />
                                            <span className='flex-1'>History</span>
                                            {activeView === ViewMode.HISTORY && (
                                                <Check width='16' height='16' />
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                            {hasFiles && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        setActiveView(ViewMode.FILES);
                                    }}
                                    className={menuButtonClasses}
                                    data-testid='files-view-menu-item'
                                >
                                    <Box width='16' height='16' />
                                    <span className='flex-1'>Files</span>
                                    {activeView === ViewMode.FILES && (
                                        <Check width='16' height='16' />
                                    )}
                                </button>
                            )}
                            <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1' />

                            {/* Reading mode toggle & editor tools */}
                            {activeView === ViewMode.CONTENT && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            handleFind();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='find-menu-item'
                                    >
                                        <Search width='16' height='16' />
                                        <span className='flex-1'>Find</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            handleReplace();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='replace-menu-item'
                                    >
                                        <InputOutput width='16' height='16' />
                                        <span className='flex-1'>Replace...</span>
                                    </button>
                                    <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1' />
                                </>
                            )}
                            {activeView === ViewMode.CONTENT && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        toggleOutline();
                                    }}
                                    className={menuButtonClasses}
                                    data-testid='toggle-outline-menu-item'
                                >
                                    <TreeView width='16' height='16' />
                                    <span className='flex-1'>Toggle Outline</span>
                                    {showOutline && <Check width='16' height='16' />}
                                </button>
                            )}
                            {lspLoaded &&
                                enableEditing &&
                                activeView === ViewMode.CONTENT && (
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            smartLink(false);
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='auto-link-menu-item'
                                    >
                                        <LightBulb width='16' height='16' />
                                        <span className='flex-1'>Auto Link</span>
                                    </button>
                                )}
                            {enableEditing &&
                                lspLoaded &&
                                activeView === ViewMode.CONTENT && (
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            smartLink(true);
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='add-timestamps-menu-item'
                                    >
                                        <LightBulb width='16' height='16' />
                                        <span className='flex-1'>Add Timestamps</span>
                                    </button>
                                )}
                            {isAdmin && !isFleeting && activeView !== ViewMode.GRAPH && (
                                <>
                                    <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1' />
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            handleRelinkNote();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='relink-note-menu-item'
                                    >
                                        <RefreshCircle width='16' height='16' />
                                        <span className='flex-1'>Relink Note</span>
                                    </button>
                                </>
                            )}
                            {activeView !== ViewMode.GRAPH && (
                                <>
                                    <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1' />
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            handleUploadFiles();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='manage-files-menu-item'
                                    >
                                        <CloudUpload width='16' height='16' />
                                        <span className='flex-1'>Upload Files</span>
                                    </button>
                                </>
                            )}
                            {isFleeting && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        handleSaveAsFinal();
                                    }}
                                    className={menuButtonClasses}
                                    data-testid='save-as-final-menu-item'
                                >
                                    <FloppyDisk width='16' height='16' />
                                    <span className='flex-1'>Save As Final</span>
                                    {saving && (
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900' />
                                    )}
                                </button>
                            )}
                            {activeView !== ViewMode.GRAPH && (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            enrichData();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='enrich-data-menu-item'
                                    >
                                        <Sparks width='16' height='16' />
                                        <span className='flex-1'>Enrich Artifacts</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowActionsMenu(false);
                                            handlePublish();
                                        }}
                                        className={menuButtonClasses}
                                        data-testid='publish-menu-item'
                                    >
                                        <StatsReport width='16' height='16' />
                                        <span className='flex-1'>Publish</span>
                                    </button>
                                </>
                            )}
                            <div className='border-t border-gray-600/40 dark:border-gray-500/40 my-1' />
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                    handleDelete();
                                }}
                                className={destructiveMenuButtonClasses}
                                data-testid='delete-note-menu-item'
                            >
                                <Trash width='16' height='16' />
                                <span className='flex-1'>Delete</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
