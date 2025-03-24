import React, { useState, useId } from 'react';

const Tabs = ({
    children,
    tabClasses = 'tabs-underline',
    perTabClass = '',
    defaultTab = 0,
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const groupId = useId(); // Generates a unique id for this instance

    // Filter out only Tab components from children
    const tabs = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && child.type === Tab,
    );

    return (
        <div className='flex-col'>
            <div className={`tabs mx-2 ${tabClasses}`}>
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
                                onChange={() => setActiveTab(index)}
                            />
                            <label
                                htmlFor={tabId}
                                className={`mb-2 tab px-6 cursor-pointer ${perTabClass}`}
                                onClick={() => setActiveTab(index)}
                            >
                                {tab.props.title}
                            </label>
                        </React.Fragment>
                    );
                })}
            </div>

            <div className=''>
                {tabs.map((tab, index) => (
                    <div
                        key={`tab-content-${index}`}
                        className={tab.classes}
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

const Tab = ({ children, title, classes }) => {
    return <div>{children}</div>;
};

export { Tabs, Tab };
