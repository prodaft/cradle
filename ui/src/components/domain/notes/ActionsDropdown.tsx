import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    StatsReport,
} from 'iconoir-react';
import { FloppyDisk, LightBulb, Trash } from 'iconoir-react/regular';
import { ViewMode } from './constants';

interface ActionsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    enableEditing: boolean;
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
    enableEditing,
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
    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground border-border'
                            data-testid='actions-dropdown-btn'
                        >
                            <MoreVert width='20' height='20' />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='end' className='w-48'>
                {/* View / editor mode options */}
                <DropdownMenuItem
                    onClick={() => {
                        setActiveView(ViewMode.CONTENT);
                        setRichEditor(true);
                    }}
                    data-testid='rich-editor-menu-item'
                >
                    <Page width='16' height='16' />
                    <span className='flex-1'>Rich Editor</span>
                    {activeView === ViewMode.CONTENT && richEditor && (
                        <Check width='16' height='16' />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        setActiveView(ViewMode.CONTENT);
                        setRichEditor(false);
                    }}
                    data-testid='markdown-editor-menu-item'
                >
                    <Code width='16' height='16' />
                    <span className='flex-1'>Source Editor</span>
                    {activeView === ViewMode.CONTENT && !richEditor && (
                        <Check width='16' height='16' />
                    )}
                </DropdownMenuItem>
                {!isFleeting && (
                    <>
                        <DropdownMenuItem
                            onClick={() => setActiveView(ViewMode.GRAPH)}
                            data-testid='graph-view-menu-item'
                        >
                            <Graph width='16' height='16' />
                            <span className='flex-1'>Graph</span>
                            {activeView === ViewMode.GRAPH && (
                                <Check width='16' height='16' />
                            )}
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem
                                onClick={() => setActiveView(ViewMode.HISTORY)}
                                data-testid='history-view-menu-item'
                            >
                                <ClockRotateRight width='16' height='16' />
                                <span className='flex-1'>History</span>
                                {activeView === ViewMode.HISTORY && (
                                    <Check width='16' height='16' />
                                )}
                            </DropdownMenuItem>
                        )}
                    </>
                )}
                {hasFiles && (
                    <DropdownMenuItem
                        onClick={() => setActiveView(ViewMode.FILES)}
                        data-testid='files-view-menu-item'
                    >
                        <Box width='16' height='16' />
                        <span className='flex-1'>Files</span>
                        {activeView === ViewMode.FILES && (
                            <Check width='16' height='16' />
                        )}
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />

                {/* Reading mode toggle & editor tools */}
                {activeView === ViewMode.CONTENT && (
                    <>
                        <DropdownMenuItem
                            onClick={handleFind}
                            data-testid='find-menu-item'
                        >
                            <Search width='16' height='16' />
                            <span className='flex-1'>Find</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleReplace}
                            data-testid='replace-menu-item'
                        >
                            <InputOutput width='16' height='16' />
                            <span className='flex-1'>Replace...</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={toggleOutline}
                        data-testid='toggle-outline-menu-item'
                    >
                        <TreeView width='16' height='16' />
                        <span className='flex-1'>Toggle Outline</span>
                        {showOutline && <Check width='16' height='16' />}
                    </DropdownMenuItem>
                )}
                {lspLoaded && enableEditing && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(false)}
                        data-testid='auto-link-menu-item'
                    >
                        <LightBulb width='16' height='16' />
                        <span className='flex-1'>Auto Link</span>
                    </DropdownMenuItem>
                )}
                {enableEditing && lspLoaded && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(true)}
                        data-testid='add-timestamps-menu-item'
                    >
                        <LightBulb width='16' height='16' />
                        <span className='flex-1'>Add Timestamps</span>
                    </DropdownMenuItem>
                )}
                {isAdmin && !isFleeting && activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleRelinkNote}
                            data-testid='relink-note-menu-item'
                        >
                            <RefreshCircle width='16' height='16' />
                            <span className='flex-1'>Relink Note</span>
                        </DropdownMenuItem>
                    </>
                )}
                {activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleUploadFiles}
                            data-testid='manage-files-menu-item'
                        >
                            <CloudUpload width='16' height='16' />
                            <span className='flex-1'>Upload Files</span>
                        </DropdownMenuItem>
                    </>
                )}
                {isFleeting && (
                    <DropdownMenuItem
                        onClick={handleSaveAsFinal}
                        data-testid='save-as-final-menu-item'
                    >
                        <FloppyDisk width='16' height='16' />
                        <span className='flex-1'>Save As Final</span>
                        {saving && (
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-foreground' />
                        )}
                    </DropdownMenuItem>
                )}
                {activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuItem
                            onClick={enrichData}
                            data-testid='enrich-data-menu-item'
                        >
                            <Sparks width='16' height='16' />
                            <span className='flex-1'>Enrich Artifacts</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handlePublish}
                            data-testid='publish-menu-item'
                        >
                            <StatsReport width='16' height='16' />
                            <span className='flex-1'>Publish</span>
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleDelete}
                    variant='destructive'
                    data-testid='delete-note-menu-item'
                >
                    <Trash width='16' height='16' />
                    <span className='flex-1'>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
