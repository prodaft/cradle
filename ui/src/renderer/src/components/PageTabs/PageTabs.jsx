import {
    Xmark,
    NavArrowDown,
    Plus,
} from 'iconoir-react';
import React, { useRef, useState } from 'react';
import { useTabs } from '../../contexts/TabsContext/TabsContext';
import * as Iconoir from 'iconoir-react';

/**
 * PageTabs component - VS Code-style tab bar for managing open pages
 * @returns {React.ReactElement}
 */
const PageTabs = () => {
    const tabsContext = useTabs();
    const { tabs, activeTabIndex, switchToTab, closeTab, closeOtherTabs, closeTabsToRight, reorderTabs, createNewTab } = tabsContext || {};
    const [contextMenuTab, setContextMenuTab] = useState(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [draggedTab, setDraggedTab] = useState(null);
    const [dragOverTab, setDragOverTab] = useState(null);
    const contextMenuRef = useRef(null);

    // If tabs context is not available or tabs are empty, don't render
    if (!tabsContext || !tabs || tabs.length === 0) {
        return null;
    }

    /**
     * Handles right-click on a tab to show context menu
     */
    const handleContextMenu = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuTab(index);
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
    };

    /**
     * Closes the context menu
     */
    const handleCloseContextMenu = () => {
        setContextMenuTab(null);
    };

    /**
     * Handles click outside context menu
     */
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                handleCloseContextMenu();
            }
        };

        if (contextMenuTab !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [contextMenuTab]);

    /**
     * Handles tab click
     */
    const handleTabClick = (index) => {
        switchToTab(index);
    };

    /**
     * Handles close button click
     */
    const handleCloseClick = (e, index) => {
        e.stopPropagation();
        closeTab(index);
    };

    /**
     * Handles drag start
     */
    const handleDragStart = (e, index) => {
        setDraggedTab(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget);
    };

    /**
     * Handles drag over
     */
    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedTab !== null && draggedTab !== index) {
            // Determine if we should show drop indicator before or after based on cursor position
            const rect = e.currentTarget.getBoundingClientRect();
            const midPoint = rect.left + rect.width / 2;
            const dropBefore = e.clientX < midPoint;
            
            // Store both the index and whether to drop before or after
            setDragOverTab({ index, dropBefore });
        }
    };

    /**
     * Handles drag leave
     */
    const handleDragLeave = () => {
        setDragOverTab(null);
    };

    /**
     * Handles drop
     */
    const handleDrop = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (draggedTab !== null && draggedTab !== index && dragOverTab) {
            // Calculate the actual target index based on drop position
            let targetIndex = index;
            if (!dragOverTab.dropBefore && index < draggedTab) {
                targetIndex = index;
            } else if (!dragOverTab.dropBefore && index > draggedTab) {
                targetIndex = index;
            } else if (dragOverTab.dropBefore && index > draggedTab) {
                targetIndex = index - 1;
            } else if (dragOverTab.dropBefore && index < draggedTab) {
                targetIndex = index;
            }
            
            reorderTabs(draggedTab, targetIndex);
        }
        
        setDraggedTab(null);
        setDragOverTab(null);
    };

    /**
     * Handles drag end
     */
    const handleDragEnd = () => {
        setDraggedTab(null);
        setDragOverTab(null);
    };

    /**
     * Gets the icon component for a tab
     */
    const getIconComponent = (iconName) => {
        const IconComponent = Iconoir[iconName];
        const iconProps = { width: '1em', height: '1em', strokeWidth: 1.5 };
        return IconComponent ? <IconComponent {...iconProps} /> : <Iconoir.Page {...iconProps} />;
    };

    return (
        <div className='flex items-center h-10 cradle-bg-elevated cradle-border-b overflow-x-auto overflow-y-hidden cradle-scrollbar-thin'>
            {tabs.map((tab, index) => {
                const isActive = index === activeTabIndex;
                const isDragging = draggedTab === index;
                const showDropBefore = dragOverTab?.index === index && dragOverTab?.dropBefore;
                const showDropAfter = dragOverTab?.index === index && !dragOverTab?.dropBefore;
                
                return (
                    <div key={`tab-wrapper-${tab.id || index}`} className='relative flex items-center h-full'>
                        {/* Drop indicator - before */}
                        {showDropBefore && (
                            <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-[#FF8C00] z-10' />
                        )}
                        
                        <div
                            key={tab.id || `${tab.path}-${index}`}
                            draggable
                            className={`
                                flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px]
                                cursor-move group relative
                                
                                ${isActive 
                                    ? 'cradle-bg-primary border-t border-l border-r cradle-border cradle-text-secondary border-b border-cradle-bg-primary' 
                                    : 'cradle-bg-elevated cradle-text-tertiary cradle-border'
                                }
                                ${isDragging ? 'opacity-50' : ''}
                            `}
                        onClick={() => handleTabClick(index)}
                        onContextMenu={(e) => handleContextMenu(e, index)}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        title={tab.title}
                    >
                        {/* Icon */}
                        <div className='flex-shrink-0' style={{ width: '1em', height: '1em' }}>
                            {getIconComponent(tab.icon)}
                        </div>
                        
                        {/* Title */}
                        <span className='flex-1 truncate text-sm cradle-mono'>
                            {tab.title}
                        </span>
                        
                        {/* Close button */}
                        <button
                            className={`
                                flex-shrink-0 rounded p-0.5
                                
                                border border-transparent hover:cradle-border
                                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                            onClick={(e) => handleCloseClick(e, index)}
                            title='Close'
                        >
                            <Xmark width='0.9em' height='0.9em' />
                        </button>
                    </div>
                    
                    {/* Drop indicator - after */}
                    {showDropAfter && (
                        <div className='absolute right-0 top-0 bottom-0 w-0.5 bg-[#FF8C00] z-10' />
                    )}
                    </div>
                );
            })}

            {/* New Tab Button */}
            <button
                className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:border-[#FF8C00] border border-transparent cradle-border-l'
                onClick={createNewTab}
                title='New Tab'
            >
                <Plus width='1.2em' height='1.2em' />
            </button>

            {/* Context Menu */}
            {contextMenuTab !== null && (
                <div
                    ref={contextMenuRef}
                    className='fixed z-50 cradle-bg-elevated cradle-border rounded shadow-lg py-1 min-w-[180px]'
                    style={{
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                >
                    <button
                        className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                        onClick={() => {
                            closeTab(contextMenuTab);
                            handleCloseContextMenu();
                        }}
                    >
                        <Xmark width='1em' height='1em' />
                        Close
                    </button>
                    {tabs.length > 1 && (
                        <button
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                            onClick={() => {
                                closeOtherTabs(contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' />
                            Close Others
                        </button>
                    )}
                    {contextMenuTab < tabs.length - 1 && (
                        <button
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                            onClick={() => {
                                closeTabsToRight(contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' style={{ transform: 'rotate(-90deg)' }} />
                            Close to the Right
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PageTabs;

