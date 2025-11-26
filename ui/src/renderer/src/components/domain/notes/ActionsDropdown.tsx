import Tooltip from '@components/base/Tooltip/Tooltip';
import { TreeView } from '@phosphor-icons/react';
import { Check, CloudUpload, MoreVert, RefreshCircle } from 'iconoir-react';
import { FloppyDisk, LightBulb, Trash } from 'iconoir-react/regular';
import { ViewMode } from './constants';

interface ActionsDropdownProps {
    activeView: ViewMode;
    showActionsMenu: boolean;
    enableEditing: boolean;
    setShowActionsMenu: (show: boolean) => void;
    showOutline: boolean;
    toggleOutline: () => void;
    lspLoaded: boolean;
    smartLink: (addTimestamps: boolean) => void;
    isAdmin: boolean;
    handleRelinkNote: () => void;
    isFleeting: boolean;
    handleSaveAsFinal: () => void;
    saving: boolean;
    handlePublish: () => void;
    handleDelete: () => void;
}

/**
 * Dropdown menu for note actions (outline, auto link, upload, delete, etc.)
 */
export default function ActionsDropdown({
    activeView,
    showActionsMenu,
    enableEditing,
    setShowActionsMenu,
    showOutline,
    toggleOutline,
    lspLoaded,
    smartLink,
    isAdmin,
    handleRelinkNote,
    isFleeting,
    handleSaveAsFinal,
    saving,
    handlePublish,
    handleDelete,
}: ActionsDropdownProps) {
    return (
        <div className='relative'>
            <Tooltip content='Actions'>
                <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00]'
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
                    <div className='absolute right-0 mt-2 w-48 cradle-bg-elevated cradle-border z-20'>
                        <div role='menu'>
                            {activeView === ViewMode.CONTENT && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        toggleOutline();
                                    }}
                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                        data-testid='add-timestamps-menu-item'
                                    >
                                        <LightBulb width='16' height='16' />
                                        <span className='flex-1'>Add Timestamps</span>
                                    </button>
                                )}
                            {isAdmin && !isFleeting && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        handleRelinkNote();
                                    }}
                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                    data-testid='relink-note-menu-item'
                                >
                                    <RefreshCircle width='16' height='16' />
                                    <span className='flex-1'>Relink Note</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                }}
                                className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                data-testid='upload-files-menu-item'
                            >
                                <CloudUpload width='16' height='16' />
                                <span className='flex-1'>Upload Files</span>
                            </button>
                            {isFleeting && (
                                <button
                                    onClick={() => {
                                        setShowActionsMenu(false);
                                        handleSaveAsFinal();
                                    }}
                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                    data-testid='save-as-final-menu-item'
                                >
                                    <FloppyDisk width='16' height='16' />
                                    <span className='flex-1'>Save As Final</span>
                                    {saving && (
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900' />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                    handlePublish();
                                }}
                                className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                data-testid='publish-menu-item'
                            >
                                <CloudUpload width='16' height='16' />
                                <span className='flex-1'>Publish</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowActionsMenu(false);
                                    handleDelete();
                                }}
                                className='w-full text-left px-4 py-2 text-sm text-red-500 cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
