import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    ArrowClockwiseIcon,
    ArrowsLeftRightIcon,
    ChartBarIcon,
    CheckIcon,
    ClockCounterClockwiseIcon,
    CloudArrowUpIcon,
    CodeIcon,
    CubeIcon,
    DotsThreeVerticalIcon,
    FileTextIcon,
    FloppyDiskIcon,
    GraphIcon,
    LightbulbIcon,
    MagnifyingGlassIcon,
    SparkleIcon,
    TrashIcon,
    TreeViewIcon,
} from '@phosphor-icons/react';
import { ViewMode } from './constants';

interface ActionsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    enableEditing: boolean;
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
    canWrite: boolean;
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
    canWrite,
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
                            className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                            data-testid='actions-dropdown-btn'
                        >
                            <DotsThreeVerticalIcon size={20} weight='bold' />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='end' className='w-48'>
                {/* View / editor mode options */}
                <DropdownMenuItem
                    onClick={() => {
                        setRichEditor(true);
                        if (activeView !== ViewMode.CONTENT)
                            setActiveView(ViewMode.CONTENT);
                    }}
                    data-testid='rich-editor-menu-item'
                >
                    <FileTextIcon size={16} weight='bold' />
                    <span className='flex-1'>Rich Editor</span>
                    {activeView === ViewMode.CONTENT && richEditor && (
                        <CheckIcon size={16} weight='bold' />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        setRichEditor(false);
                        if (activeView !== ViewMode.CONTENT)
                            setActiveView(ViewMode.CONTENT);
                    }}
                    data-testid='markdown-editor-menu-item'
                >
                    <CodeIcon size={16} weight='bold' />
                    <span className='flex-1'>Source Editor</span>
                    {activeView === ViewMode.CONTENT && !richEditor && (
                        <CheckIcon size={16} weight='bold' />
                    )}
                </DropdownMenuItem>
                {!isFleeting && (
                    <>
                        <DropdownMenuItem
                            onClick={() => setActiveView(ViewMode.GRAPH)}
                            data-testid='graph-view-menu-item'
                        >
                            <GraphIcon width='16' height='16' />
                            <span className='flex-1'>Graph</span>
                            {activeView === ViewMode.GRAPH && (
                                <CheckIcon size={16} weight='bold' />
                            )}
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem
                                onClick={() => setActiveView(ViewMode.HISTORY)}
                                data-testid='history-view-menu-item'
                            >
                                <ClockCounterClockwiseIcon size={16} weight='bold' />
                                <span className='flex-1'>History</span>
                                {activeView === ViewMode.HISTORY && (
                                    <CheckIcon size={16} weight='bold' />
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
                        <CubeIcon size={16} weight='bold' />
                        <span className='flex-1'>Files</span>
                        {activeView === ViewMode.FILES && (
                            <CheckIcon size={16} weight='bold' />
                        )}
                    </DropdownMenuItem>
                )}
                {/* Reading mode toggle & editor tools */}
                {activeView === ViewMode.CONTENT && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleFind}
                            data-testid='find-menu-item'
                        >
                            <MagnifyingGlassIcon size={16} weight='bold' />
                            <span className='flex-1'>Find</span>
                            <DropdownMenuShortcut>
                                <KbdGroup>
                                    <Kbd>Ctrl</Kbd>
                                    <Kbd>F</Kbd>
                                </KbdGroup>
                            </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        {enableEditing && (
                            <DropdownMenuItem
                                onClick={handleReplace}
                                data-testid='replace-menu-item'
                            >
                                <ArrowsLeftRightIcon size={16} weight='bold' />
                                <span className='flex-1'>Replace...</span>
                                <DropdownMenuShortcut>
                                    <KbdGroup>
                                        <Kbd>Ctrl</Kbd>
                                        <Kbd>H</Kbd>
                                    </KbdGroup>
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                    </>
                )}
                {activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={toggleOutline}
                        data-testid='toggle-outline-menu-item'
                    >
                        <TreeViewIcon width='16' height='16' />
                        <span className='flex-1'>Outline</span>
                        {showOutline && <CheckIcon size={16} weight='bold' />}
                    </DropdownMenuItem>
                )}
                {lspLoaded && enableEditing && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(false)}
                        data-testid='auto-link-menu-item'
                    >
                        <LightbulbIcon size={16} weight='bold' />
                        <span className='flex-1'>Auto Link</span>
                    </DropdownMenuItem>
                )}
                {enableEditing && lspLoaded && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(true)}
                        data-testid='add-timestamps-menu-item'
                    >
                        <LightbulbIcon size={16} weight='bold' />
                        <span className='flex-1'>Add Timestamps</span>
                    </DropdownMenuItem>
                )}
                {isAdmin && !isFleeting && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={handleRelinkNote}
                        data-testid='relink-note-menu-item'
                    >
                        <ArrowClockwiseIcon size={16} weight='bold' />
                        <span className='flex-1'>Relink</span>
                    </DropdownMenuItem>
                )}
                {canWrite && activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleUploadFiles}
                            data-testid='manage-files-menu-item'
                        >
                            <CloudArrowUpIcon size={16} weight='bold' />
                            <span className='flex-1'>Upload Files</span>
                        </DropdownMenuItem>
                    </>
                )}
                {isFleeting && canWrite && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleSaveAsFinal}
                            data-testid='save-as-final-menu-item'
                        >
                            <FloppyDiskIcon size={16} weight='bold' />
                            <span className='flex-1'>Save As Final</span>
                            {saving && <Spinner />}
                        </DropdownMenuItem>
                    </>
                )}
                {activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuItem
                            onClick={enrichData}
                            data-testid='enrich-data-menu-item'
                        >
                            <SparkleIcon size={16} weight='bold' />
                            <span className='flex-1'>Enrich Artifacts</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handlePublish}
                            data-testid='publish-menu-item'
                        >
                            <ChartBarIcon size={16} weight='bold' />
                            <span className='flex-1'>Publish</span>
                        </DropdownMenuItem>
                    </>
                )}
                {canWrite && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleDelete}
                            variant='destructive'
                            data-testid='delete-note-menu-item'
                        >
                            <TrashIcon size={16} weight='bold' />
                            <span className='flex-1'>Delete</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
