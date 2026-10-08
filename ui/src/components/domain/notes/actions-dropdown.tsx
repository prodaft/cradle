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
    isOutlineOpen: boolean;
    toggleOutline: () => void;
    isLspLoaded: boolean;
    smartLink: (addTimestamps: boolean) => void;
    isAdmin: boolean;
    relink: () => void;
    isFleeting: boolean;
    hasFiles: boolean;
    finalize: () => void;
    isSaving: boolean;
    publish: () => void;
    confirmDelete: () => void;
    isWritable: boolean;
    openUpload: () => void;
    find: () => void;
    replace: () => void;
    enrich: () => void;
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
    isOutlineOpen,
    toggleOutline,
    isLspLoaded,
    smartLink,
    isAdmin,
    relink,
    isFleeting,
    hasFiles,
    finalize,
    isSaving,
    publish,
    confirmDelete,
    isWritable,
    openUpload,
    find,
    replace,
    enrich,
}: ActionsDropdownProps) {
    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    data-testid='actions-dropdown-btn'
                                />
                            }
                        />
                    }
                >
                    <DotsThreeVerticalIcon size={20} weight='bold' />
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
                        <DropdownMenuItem onClick={find} data-testid='find-menu-item'>
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
                                onClick={replace}
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
                        {isOutlineOpen && <CheckIcon size={16} weight='bold' />}
                    </DropdownMenuItem>
                )}
                {isLspLoaded && enableEditing && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(false)}
                        data-testid='auto-link-menu-item'
                    >
                        <LightbulbIcon size={16} weight='bold' />
                        <span className='flex-1'>Auto Link</span>
                    </DropdownMenuItem>
                )}
                {enableEditing && isLspLoaded && activeView === ViewMode.CONTENT && (
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
                        onClick={relink}
                        data-testid='relink-note-menu-item'
                    >
                        <ArrowClockwiseIcon size={16} weight='bold' />
                        <span className='flex-1'>Relink</span>
                    </DropdownMenuItem>
                )}
                {isWritable && activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={openUpload}
                            data-testid='manage-files-menu-item'
                        >
                            <CloudArrowUpIcon size={16} weight='bold' />
                            <span className='flex-1'>Upload Files</span>
                        </DropdownMenuItem>
                    </>
                )}
                {isFleeting && isWritable && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={finalize}
                            data-testid='save-as-final-menu-item'
                        >
                            <FloppyDiskIcon size={16} weight='bold' />
                            <span className='flex-1'>Save As Final</span>
                            {isSaving && <Spinner />}
                        </DropdownMenuItem>
                    </>
                )}
                {activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuItem
                            onClick={enrich}
                            data-testid='enrich-data-menu-item'
                        >
                            <SparkleIcon size={16} weight='bold' />
                            <span className='flex-1'>Enrich Artifacts</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={publish}
                            data-testid='publish-menu-item'
                        >
                            <ChartBarIcon size={16} weight='bold' />
                            <span className='flex-1'>Publish</span>
                        </DropdownMenuItem>
                    </>
                )}
                {isWritable && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={confirmDelete}
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
