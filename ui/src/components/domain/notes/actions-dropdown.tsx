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
    CheckIcon,
    ClockCounterClockwiseIcon,
    CodeIcon,
    DotsThreeVerticalIcon,
    ExportIcon,
    EyeSlashIcon,
    FileTextIcon,
    GraphIcon,
    LightbulbIcon,
    MagnifyingGlassIcon,
    PaperclipIcon,
    PaperPlaneTiltIcon,
    ShareNetworkIcon,
    SparkleIcon,
    TrashIcon,
    TreeViewIcon,
} from '@phosphor-icons/react';
import { ViewMode, type SidebarSection } from './constants';

interface ActionsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    enableEditing: boolean;
    setActiveView: (view: ViewMode) => void;
    setRichEditor: (rich: boolean) => void;
    /** Sidebar sections showing, top to bottom; empty when the sidebar is closed. */
    sidebarSections: SidebarSection[];
    toggleSidebarSection: (section: SidebarSection) => void;
    isLspLoaded: boolean;
    smartLink: (addTimestamps: boolean) => void;
    isAdmin: boolean;
    relink: () => void;
    isFleeting: boolean;
    isAuthor: boolean;
    share: () => void;
    publish: () => void;
    isSaving: boolean;
    exportReport: () => void;
    confirmDelete: () => void;
    canUnpublish: boolean;
    confirmUnpublish: () => void;
    isWritable: boolean;
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
    sidebarSections,
    toggleSidebarSection,
    isLspLoaded,
    smartLink,
    isAdmin,
    relink,
    isFleeting,
    isAuthor,
    share,
    publish,
    isSaving,
    exportReport,
    confirmDelete,
    canUnpublish,
    confirmUnpublish,
    isWritable,
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
                                    className='text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    data-testid='actions-dropdown-btn'
                                />
                            }
                        />
                    }
                >
                    <DotsThreeVerticalIcon weight='bold' />
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
                    <FileTextIcon weight='bold' />
                    <span className='flex-1'>Rich Editor</span>
                    {activeView === ViewMode.CONTENT && richEditor && (
                        <CheckIcon weight='bold' />
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
                    <CodeIcon weight='bold' />
                    <span className='flex-1'>Source Editor</span>
                    {activeView === ViewMode.CONTENT && !richEditor && (
                        <CheckIcon weight='bold' />
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
                                <CheckIcon weight='bold' />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setActiveView(ViewMode.HISTORY)}
                            data-testid='history-view-menu-item'
                        >
                            <ClockCounterClockwiseIcon weight='bold' />
                            <span className='flex-1'>History</span>
                            {activeView === ViewMode.HISTORY && (
                                <CheckIcon weight='bold' />
                            )}
                        </DropdownMenuItem>
                    </>
                )}
                {/* Reading mode toggle & editor tools */}
                {activeView === ViewMode.CONTENT && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={find} data-testid='find-menu-item'>
                            <MagnifyingGlassIcon weight='bold' />
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
                                <ArrowsLeftRightIcon weight='bold' />
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
                    <>
                        <DropdownMenuItem
                            onClick={() => toggleSidebarSection('outline')}
                            data-testid='toggle-outline-menu-item'
                        >
                            <TreeViewIcon />
                            <span className='flex-1'>Outline</span>
                            {sidebarSections.includes('outline') && (
                                <CheckIcon weight='bold' />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => toggleSidebarSection('files')}
                            data-testid='toggle-files-menu-item'
                        >
                            <PaperclipIcon weight='bold' />
                            <span className='flex-1'>Files</span>
                            {sidebarSections.includes('files') && (
                                <CheckIcon weight='bold' />
                            )}
                        </DropdownMenuItem>
                    </>
                )}
                {isLspLoaded && enableEditing && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(false)}
                        data-testid='auto-link-menu-item'
                    >
                        <LightbulbIcon weight='bold' />
                        <span className='flex-1'>Auto Link</span>
                    </DropdownMenuItem>
                )}
                {enableEditing && isLspLoaded && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={() => smartLink(true)}
                        data-testid='add-timestamps-menu-item'
                    >
                        <LightbulbIcon weight='bold' />
                        <span className='flex-1'>Add Timestamps</span>
                    </DropdownMenuItem>
                )}
                {isAdmin && !isFleeting && activeView === ViewMode.CONTENT && (
                    <DropdownMenuItem
                        onClick={relink}
                        data-testid='relink-note-menu-item'
                    >
                        <ArrowClockwiseIcon weight='bold' />
                        <span className='flex-1'>Relink</span>
                    </DropdownMenuItem>
                )}
                {isFleeting && isAuthor && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={share}
                            data-testid='share-note-menu-item'
                        >
                            <ShareNetworkIcon weight='bold' />
                            <span className='flex-1'>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={publish}
                            data-testid='publish-menu-item'
                        >
                            <PaperPlaneTiltIcon weight='bold' />
                            <span className='flex-1'>Publish</span>
                            {isSaving && <Spinner />}
                        </DropdownMenuItem>
                    </>
                )}
                {canUnpublish && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={confirmUnpublish}
                            data-testid='unpublish-menu-item'
                        >
                            <EyeSlashIcon weight='bold' />
                            <span className='flex-1'>Unpublish</span>
                        </DropdownMenuItem>
                    </>
                )}
                {activeView !== ViewMode.GRAPH && (
                    <>
                        <DropdownMenuItem
                            onClick={enrich}
                            data-testid='enrich-data-menu-item'
                        >
                            <SparkleIcon weight='bold' />
                            <span className='flex-1'>Enrich</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={exportReport}
                            data-testid='export-menu-item'
                        >
                            <ExportIcon weight='bold' />
                            <span className='flex-1'>Export</span>
                        </DropdownMenuItem>
                    </>
                )}
                {isWritable && (!isFleeting || isAuthor || isAdmin) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={confirmDelete}
                            variant='destructive'
                            data-testid='delete-note-menu-item'
                        >
                            <TrashIcon weight='bold' />
                            <span className='flex-1'>Delete</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
