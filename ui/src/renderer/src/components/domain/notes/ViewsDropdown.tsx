import { Graph } from '@phosphor-icons/react';
import { Box, Check, ClockRotateRight, Code, Page } from 'iconoir-react';
import Tooltip from '../../base/Tooltip/Tooltip';
import { ViewMode } from './constants';

interface ViewsDropdownProps {
    activeView: ViewMode;
    richEditor: boolean;
    isFleeting: boolean;
    showViewsMenu: boolean;
    setShowViewsMenu: (show: boolean) => void;
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
    showViewsMenu,
    setShowViewsMenu,
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
        <div className='relative'>
            <Tooltip content={getViewLabel()}>
                <button
                    onClick={() => setShowViewsMenu(!showViewsMenu)}
                    className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:cradle-text-primary cradle-border hover:border-[#FF8C00]'
                    data-testid='views-dropdown-btn'
                >
                    {getViewIcon()}
                </button>
            </Tooltip>
            {showViewsMenu && (
                <>
                    <div
                        className='fixed inset-0 z-10'
                        onClick={() => setShowViewsMenu(false)}
                    />
                    <div className='absolute right-0 w-48 mt-2 cradle-bg-elevated cradle-border z-20'>
                        <div role='menu'>
                            <button
                                onClick={() => {
                                    setShowViewsMenu(false);
                                    setActiveView(ViewMode.CONTENT);
                                    setRichEditor(true);
                                }}
                                className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
                                    setShowViewsMenu(false);
                                    setActiveView(ViewMode.CONTENT);
                                    setRichEditor(false);
                                }}
                                className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                data-testid='markdown-editor-menu-item'
                            >
                                <Code width='16' height='16' />
                                <span className='flex-1'>Markdown Editor</span>
                                {activeView === ViewMode.CONTENT && !richEditor && (
                                    <Check width='16' height='16' />
                                )}
                            </button>
                            {!isFleeting && (<>
                                <button
                                    onClick={() => {
                                        setShowViewsMenu(false);
                                        setActiveView(ViewMode.GRAPH);
                                    }}
                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
                                            setShowViewsMenu(false);
                                            setActiveView(ViewMode.HISTORY);
                                        }}
                                        className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
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
                                        setShowViewsMenu(false);
                                        setActiveView(ViewMode.FILES);
                                    }}
                                    className='w-full text-left px-4 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                    data-testid='files-view-menu-item'
                                >
                                    <Box width='16' height='16' />
                                    <span className='flex-1'>Files</span>
                                    {activeView === ViewMode.FILES && (
                                        <Check width='16' height='16' />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
