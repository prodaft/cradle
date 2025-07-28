import React, { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Tabs = ({
    children,
    tabClasses = 'tabs-underline',
    perTabClass = '',
    defaultTab = 0,
    queryParam = null, // URL parameter name
    stickyTop = 0, // Distance from top when sticky (default 0)
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
        <div className='flex-col'>
            {/* Only show tab navigation if there's more than one tab */}
            {tabs.length > 1 && (
                <div
                    className={`tabs ${tabClasses} sticky bg-backgroundPrimary z-10 pt-2`}
                    style={{
                        top: `${stickyTop}px`,
                        margin: '0 0.5rem',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                >
                    {tabs.map((tab, index) => {
                        const tabId = `tab-${index}-${groupId}`;
                        const groupName = `tab-group-${groupId}`;
                        return (
                            <React.Fragment key={tabId}>
                                <input
                                    type='radio'
                                    id={tabId}
                                    name={groupName}
                                    className='tab-toggle'
                                    checked={activeTab === index}
                                    onChange={() => handleTabChange(index)}
                                />
                                <label
                                    htmlFor={tabId}
                                    className={`mb-2 tab px-6 cursor-pointer ${perTabClass}`}
                                    onClick={() => handleTabChange(index)}
                                >
                                    {tab.props.title}
                                </label>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
            <div>
                {tabs.map((tab, index) => (
                    <div
                        key={`tab-content-${index}`}
                        className={tab.props.classes || ''}
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
