import React, { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Tabs = ({
    children,
    tabClasses = 'tabs-underline',
    perTabClass = '',
    defaultTab = 0,
    queryParam = null, // URL parameter name
    stickyTop = 0, // Distance from top when sticky (default 0)
    actions = null, // Action buttons to display on the right
    metadata = null, // Metadata to display between tabs and actions
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const groupId = useId(); // Generates a unique id for this instance

    // Filter out only Tab components from children
    const tabs = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && child.type === Tab,
    );

    // Function to get tab index from URL query parameters
    const getTabIndexFromURL = () => {
        if (!queryParam) return defaultTab;
        const tabValue = searchParams.get(queryParam);
        if (tabValue === null) return defaultTab;
        const tabIndex = tabs.findIndex((tab) => tab.props.id === tabValue);
        if (tabIndex >= 0) return tabIndex;
        const numericIndex = parseInt(tabValue, 10);
        return !isNaN(numericIndex) && numericIndex >= 0 && numericIndex < tabs.length
            ? numericIndex
            : defaultTab;
    };

    // Handle tab change
    const handleTabChange = (index) => {
        setActiveTab(index);
        if (queryParam) {
            const newParams = new URLSearchParams(searchParams);
            const tabId = tabs[index].props.id || index.toString();
            newParams.set(queryParam, tabId);
            setSearchParams(newParams, { replace: true });
        }
    };

    // Initialize active tab from URL on mount and when URL changes
    useEffect(() => {
        if (queryParam) {
            const urlTabIndex = getTabIndexFromURL();
            setActiveTab(urlTabIndex);
        }
    }, [searchParams, queryParam]);

    return (
        <div className='flex-col h-full'>
            {/* Only show tab navigation if there's more than one tab */}
            {tabs.length > 1 && (
                <div
                    className={`flex items-center justify-between sticky cradle-bg-elevated z-10 px-4 border-b cradle-border-primary ${tabClasses}`}
                    style={{
                        top: `${stickyTop}px`,
                    }}
                >
                    <div className='flex gap-0'>
                        {tabs.map((tab, index) => {
                            const tabId = `tab-${index}-${groupId}`;
                            const isActive = activeTab === index;
                            return (
                                <button
                                    key={tabId}
                                    onClick={() => handleTabChange(index)}
                                    className={`px-6 py-3  relative ${perTabClass} ${
                                        isActive
                                            ? 'cradle-text-secondary cradle-bg-primary border-b-2 border-cradle-bg-primary'
                                            : 'cradle-text-muted hover:cradle-text-tertiary border-b-2 border-transparent hover:border-cradle-border-primary'
                                    }`}
                                >
                                    {tab.props.title}
                                </button>
                            );
                        })}
                    </div>
                    {metadata && (
                        <div className='flex-1 flex items-center px-6 py-3 cradle-mono text-xs cradle-text-tertiary'>
                            {metadata}
                        </div>
                    )}
                    {actions && (
                        <div className='flex items-center gap-2'>
                            {actions}
                        </div>
                    )}
                </div>
            )}
            <div className='flex-1 overflow-hidden'>
                {tabs.map((tab, index) => (
                    <div
                        key={`tab-content-${index}`}
                        className={`h-full ${tab.props.classes || ''}`}
                        style={{
                            display: activeTab === index ? 'block' : 'none',
                        }}
                    >
                        {tab}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Tab = ({ children, id, title, classes }) => {
    return <div>{children}</div>;
};

export { Tab, Tabs };
