import React, { ReactElement, ReactNode, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabClasses } from './types';

interface TabsProps {
    children: ReactNode;
    tabClass?: TabClasses;
    perTabClass?: string;
    defaultTab?: number;
    queryParam?: string | null;
    stickyTop?: number;
    actions?: ReactNode;
    metadata?: ReactNode;
}

interface TabProps {
    children: ReactNode;
    id?: string;
    title: string;
    classes?: string;
}

const tabClassesMap = {
    [TabClasses.UNDERLINE]: {
        active: 'cradle-text-secondary border-b-2 border-cradle-accent-primary relative',
        inactive:
            'cradle-text-muted border-b-2 border-cradle-border-primary hover:cradle-text-tertiary hover:border-cradle-border-secondary',
        container: 'flex flex-wrap -mb-0.5',
        button: 'px-4 py-2 whitespace-nowrap text-center flex-1',
        lip: 'absolute bottom-0 left-0 right-0 h-0.5 border-l-2 border-r-2 border-cradle-accent-primary', // side lip
    },
    [TabClasses.PILL]: {
        active: 'leading-none cradle-bg-secondary cradle-text-secondary rounded-full shadow px-4 py-1',
        inactive:
            'leading-none cradle-bg-elevated cradle-text-muted hover:cradle-text-tertiary hover:cradle-bg-secondary rounded-full px-4 py-2',
        container: 'flex flex-wrap gap-2',
        button: 'inline-flex items-center justify-center',
        lip: '',
    },
};

const Tabs = ({
    children,
    tabClass = TabClasses.UNDERLINE,
    perTabClass = '',
    defaultTab = 0,
    queryParam = null,
    stickyTop = 0,
    actions = null,
    metadata = null,
}: TabsProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const groupId = useId();

    // Filter out only Tab components from children
    // We check for displayName to handle HMR cases where component identity might change
    const tabs = React.Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => {
            if (!React.isValidElement(child)) return false;
            const type = child.type as any;
            return type === Tab || type.displayName === 'Tab';
        },
    );

    const tabClassStyles = tabClassesMap[tabClass];

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
    const handleTabChange = (index: number) => {
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
        <div className='flex flex-col h-full overflow-y-hidden'>
            {/* Only show tab navigation if there's more than one tab */}
            {tabs.length > 1 && (
                <div
                    className={`flex items-center justify-between sticky z-10 px-4`}
                    style={{
                        top: `${stickyTop}px`,
                    }}
                >
                    <div className={`${tabClassStyles.container} w-full`}>
                        {tabs.map((tab, index) => {
                            const tabId = `tab-${index}-${groupId}`;
                            const isActive = activeTab === index;

                            return (
                                <button
                                    type='button'
                                    key={tabId}
                                    onClick={() => handleTabChange(index)}
                                    className={`${tabClassStyles.button} ${perTabClass} ${isActive ? tabClassStyles.active : tabClassStyles.inactive}`}
                                >
                                    {tab.props.title}

                                    {tabClass === TabClasses.UNDERLINE && isActive && (
                                        <span className={tabClassStyles.lip}></span>
                                    )}
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
                        <div className='flex items-center gap-2'>{actions}</div>
                    )}
                </div>
            )}
            <div className='flex-1 overflow-hidden m-2'>
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

const Tab = ({ children }: TabProps) => {
    return <div>{children}</div>;
};

Tab.displayName = 'Tab';

export { Tab, Tabs };
