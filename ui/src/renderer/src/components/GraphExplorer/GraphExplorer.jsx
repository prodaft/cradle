import { useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';
import GraphSearch from '../GraphQuery/GraphSearch';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';

export default function GraphExplorer() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [config, setConfig] = useState({
        nodeRadiusCoefficient: 1.5,
        linkWidthCoefficient: 1,
        labelSizeCoefficient: 16,
        searchValue: '',

        layout: 'preset',
        animateLayout: false,
        showLabels: true,
    });
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [selectedEntries, setSelectedEntries] = useState(new Set());
    const cyRef = useRef(null);

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ResizableSplitPane
                initialSplitPosition={30}
                leftContent={
                    <GraphQuery
                        selectedEntries={selectedEntries}
                        setSelectedEntries={setSelectedEntries}
                        config={config}
                        setConfig={setConfig}
                        SearchComponent={GraphSearch}
                        ref={cyRef} // pass cytoscape instance to GraphQuery
                    />
                }
                rightContent={
                    <div className='relative'>
                        <Graph
                            onLinkClick={(link) => {
                                setSelectedEntries([link.source, link.target]);
                            }}
                            onNodesSelected={(nodes) => {
                                console.log(nodes);
                                setSelectedEntries(nodes);
                            }}
                            config={config}
                            ref={cyRef} // pass setter to receive the cytoscape instance
                        />
                    </div>
                }
            />
        </div>
    );
}
