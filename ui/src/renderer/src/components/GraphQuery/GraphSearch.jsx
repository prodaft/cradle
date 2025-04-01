import React, { forwardRef, useState } from 'react';
import PathFindSearch from './PathFindSearch';
import { Tabs, Tab } from '../Tabs/Tabs';
import PaginatedGraphFetch from './PaginatedGraphFetch';

const GraphSearch = forwardRef(
    ({ initialValues, processNewNode, addEdge }, graphRef) => {
        const [activeTab, setActiveTab] = useState(0);

        return (
            <div className='w-full'>
                <Tabs tabClasses='tabs gap-1' perTabClass='tab-pill'>
                    <Tab title='Find Paths' classes='space-y-4'>
                        <PathFindSearch
                            ref={graphRef}
                            initialValues={initialValues}
                            processNewNode={processNewNode}
                            addEdge={addEdge}
                        />
                    </Tab>
                    <Tab title='Fetch Graph' classes='space-y-4'>
                        <PaginatedGraphFetch
                            ref={graphRef}
                            processNewNode={processNewNode}
                            addEdge={addEdge}
                        />
                    </Tab>
                </Tabs>
            </div>
        );
    }
);

export default GraphSearch;
