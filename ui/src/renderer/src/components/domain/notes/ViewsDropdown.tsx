import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Graph } from '@phosphor-icons/react';
import { Box, Check, ClockRotateRight, Code, Page } from 'iconoir-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ViewMode } from './constants';

interface ViewsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    isFleeting: boolean;
    setActiveView: (view: ViewMode) => void;
    setRichEditor: (rich: boolean) => void;
    isAdmin: boolean;
    hasFiles: boolean;
}

/**
 * Dropdown menu for switching between different view modes
 */
export default function ViewsDropdown({
    activeView,
    isFleeting,
    richEditor,
    setActiveView,
    setRichEditor,
    isAdmin,
    hasFiles,
}: ViewsDropdownProps) {
    const getViewLabel = () => {
        if (activeView === ViewMode.CONTENT && richEditor) return 'Rich Editor';
        if (activeView === ViewMode.CONTENT && !richEditor) return 'Markdown Editor';
        if (activeView === ViewMode.GRAPH) return 'Graph';
        if (activeView === ViewMode.HISTORY) return 'History';
        return 'View';
    };

    const getViewIcon = () => {
        if (activeView === ViewMode.CONTENT && richEditor)
            return <Page width='16' height='16' />;
        if (activeView === ViewMode.CONTENT && !richEditor)
            return <Code width='16' height='16' />;
        if (activeView === ViewMode.GRAPH) return <Graph width='16' height='16' />;
        if (activeView === ViewMode.HISTORY)
            return <ClockRotateRight width='16' height='16' />;
        if (activeView === ViewMode.FILES) return <Box width='16' height='16' />;
        return null;
    };

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-bg-secondary hover:text-text-foreground border-border'
                            data-testid='views-dropdown-btn'
                        >
                            {getViewIcon()}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    {getViewLabel()}
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
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
                    <span className='flex-1'>Markdown Editor</span>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
