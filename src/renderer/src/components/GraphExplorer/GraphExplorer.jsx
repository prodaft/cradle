import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import 'tailwindcss/tailwind.css';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { useNavigate } from 'react-router-dom';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';

export default function GraphExplorer() {
    const [data, setData] = useState({
        nodes: [],
        links: [],
    });
    const [spacingCoefficient, setSpacingCoefficient] = useState(48);
    const [componentDistanceCoefficient, setComponentDistanceCoefficient] = useState(8);
    const [nodeRadiusCoefficient, setNodeRadiusCoefficient] = useState(4);
    const [linkWidth, setLinkWidth] = useState(2);
    const [centerGravity, setCenterGravity] = useState(0.05);
    const [labelSize, setLabelSize] = useState(5);
    const [showControls, setShowControls] = useState(false);
    const [is3DMode, setIs3DMode] = useState(false);
    const [entryGraphColors, setEntryGraphColors] = useState(null);
    const [cache, setCache] = useState({
        links: {},
        nodes: {},
        nodesSet: new Set(),
        linksSet: new Set(),
    });
    const [searchValue, setSearchValue] = useState('');
    const [disabledTypes, setDisabledTypes] = useState(new Set());
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [showLegend, setShowLegend] = useState(true);
    const navigate = useNavigate();
    const [selectedLinks, setSelectedLinks] = useState(new Set());
    const [interestedNodes, setInterestedNodes] = useState(new Set());
    const [notesQuery, setNotesQuery] = useState(null);

    const fgRef = useRef();

    // When filtering the graph data, we remove nodes whose "type" is in disabledTypes.types.
    // Also, we remove links if either the source or target node has a disabled type.
    const filteredData = useMemo(() => {
        return {
            nodes: data.nodes.filter((node) => !disabledTypes.has(node.subtype)),
            links: data.links.filter((link) => {
                return (
                    !disabledTypes.has(link.source.subtype) &&
                    !disabledTypes.has(link.target.subtype)
                );
            }),
        };
    }, [data, disabledTypes]);

    const filterGraph = useCallback(
        (searchValue) => {
            let matchedNodes = new Set();
            let matchedNodesId = new Set();
            for (let node of data.nodes) {
                console.log(node);
                if (
                    node.label.toLowerCase() === searchValue.toLowerCase() ||
                    node.label.toLowerCase().includes(searchValue.toLowerCase())
                ) {
                    matchedNodes.add(node);
                    matchedNodesId.add(node.id);
                }
            }
            if (matchedNodes.size === 0) {
                return;
            }
            setInterestedNodes(matchedNodesId);
            if (matchedNodes.size > 1) {
                return;
            }

            let node = matchedNodes.values().next().value;

            if (is3DMode) {
                // Aim at node from outside it
                const distance = 40;
                const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

                fgRef.current.cameraPosition(
                    {
                        x: node.x * distRatio,
                        y: node.y * distRatio,
                        z: node.z * distRatio,
                    }, // new position
                    node, // lookAt ({ x, y, z })
                    3000, // ms transition duration
                );
            } else {
                fgRef.current.centerAt(node.x + 100, node.y, 1000);
                fgRef.current.zoom(2.5, 1000);
            }
        },
        [fgRef, data, is3DMode],
    );

    const refreshDisplay = useCallback(() => {
        setDisabledTypes(new Set());
        setData({ nodes: [], links: [] });
        setCache({ links: {}, nodes: {}, nodesSet: new Set(), linksSet: new Set() });
        setInterestedNodes(new Set());
        setSelectedLinks(new Set());
    }, []);

    // Toggle the disabled status for a given type.
    const toggleDisabledType = useCallback((type) => {
        setDisabledTypes((prev) => {
            const newTypes = new Set(prev);
            if (newTypes.has(type)) {
                newTypes.delete(type);
            } else {
                newTypes.add(type);
            }
            return newTypes;
        });
    }, []);

    const ControlSlider = ({ label, value, onChange, min, max, step }) => (
        <div className='flex flex-row space-x-2 w-full'>
            <label className='flex items-center justify-between space-x-2 w-full'>
                <span className='text-sm'>{label}:</span>
                <input
                    type='range'
                    min={min}
                    max={max}
                    step={step}
                    className='range range-primary'
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
            </label>
        </div>
    );

    const ControlToggle = ({ label, checked, onChange }) => (
        <div className='flex flex-row space-x-2 items-center'>
            <label className='flex items-center justify-between space-x-2 w-full'>
                <span className='text-sm w-full'>{label}:</span>
                <input
                    type='checkbox'
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className='toggle toggle-primary w-1/2'
                />
            </label>
        </div>
    );

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ResizableSplitPane
                initialSplitPosition={40} // matches the original 2/5 width
                leftContent={
                    <GraphQuery
                        setAlert={setAlert}
                        graphData={data}
                        setGraphData={setData}
                        setEntryColors={setEntryGraphColors}
                        cache={cache}
                        setCache={setCache}
                        setHighlightedLinks={setSelectedLinks}
                        setHighlightedNodes={setInterestedNodes}
                        notesQuery={notesQuery}
                    />
                }
                rightContent={
                    <div className='relative'>
                        <Graph
                            data={filteredData}
                            node_r={nodeRadiusCoefficient}
                            linkWidth={linkWidth}
                            is3D={is3DMode}
                            spacingCoefficient={spacingCoefficient}
                            componentDistanceCoefficient={componentDistanceCoefficient}
                            centerGravity={centerGravity}
                            selectedLinks={selectedLinks}
                            setSelectedLinks={setSelectedLinks}
                            interestedNodes={interestedNodes}
                            setInterestedNodes={setInterestedNodes}
                            labelSize={labelSize}
                            fgRef={fgRef}
                            onLinkClick={(link) => {
                                setNotesQuery({
                                    references: [link.source.id, link.target.id],
                                    truncate: -1,
                                });
                            }}
                        />

                        <div className='absolute top-4 right-4'>
                            <button
                                onClick={() => setShowControls(!showControls)}
                                className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg dark:text-white p-2 rounded'
                                data-testid='toggle-controls'
                            >
                                <Menu
                                    height='1.2em'
                                    width='1.2em'
                                    className='dark:text-zinc-300'
                                />
                            </button>
                        </div>

                        {showControls && (
                            <div className='absolute top-4 right-16 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md p-4 shadow-lg z-10 w-96'>
                                <div className='flex flex-col space-y-4'>
                                    <div className='flex flex-row space-x-2 items-center'>
                                        <input
                                            type='text'
                                            className='input input-ghost-primary input-md dark:text-white'
                                            placeholder='Search Graph'
                                            onChange={(e) =>
                                                setSearchValue(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter')
                                                    filterGraph(searchValue);
                                            }}
                                        />
                                        <button
                                            className='btn btn-primary hover:opacity-80 py-0 px-3'
                                            onClick={() => filterGraph(searchValue)}
                                        >
                                            <Search
                                                height='1.2em'
                                                width='1.2em'
                                                className='text-white'
                                            />
                                        </button>
                                        <button
                                            className='btn btn-ghost py-0 px-3'
                                            onClick={() => refreshDisplay()}
                                        >
                                            <RefreshDouble
                                                height='1.2em'
                                                width='1.2em'
                                                className='text-white'
                                            />
                                        </button>
                                    </div>

                                    {/* Controls */}
                                    <div className='flex flex-col space-y-4'>
                                        <ControlSlider
                                            label='Node Size'
                                            min={1}
                                            max={10}
                                            step={0.5}
                                            value={nodeRadiusCoefficient}
                                            onChange={setNodeRadiusCoefficient}
                                        />
                                        <ControlSlider
                                            label='Link Width'
                                            min={1}
                                            max={4}
                                            step={0.5}
                                            value={linkWidth}
                                            onChange={setLinkWidth}
                                        />
                                        <ControlSlider
                                            label='Label Size'
                                            min={3}
                                            max={16}
                                            step={1}
                                            value={labelSize}
                                            onChange={setLabelSize}
                                        />

                                        <ControlToggle
                                            label='3D View'
                                            checked={is3DMode}
                                            onChange={setIs3DMode}
                                        />
                                        <ControlToggle
                                            label='Show Legend'
                                            checked={showLegend}
                                            onChange={setShowLegend}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />

                        {entryGraphColors && showLegend && (
                            <div className='absolute bottom-4 right-4 p-4 w-fit bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md'>
                                <div className='grid grid-cols-2 gap-2 max-h-32 overflow-y-auto'>
                                    {Object.entries(entryGraphColors).map(
                                        ([type, color]) => (
                                            <div
                                                key={type}
                                                className={`flex flex-row items-center space-x-2 cursor-pointer ${
                                                    disabledTypes.has(type)
                                                        ? 'opacity-50'
                                                        : ''
                                                }`}
                                                onClick={() => toggleDisabledType(type)}
                                            >
                                                <div
                                                    className='w-4 h-4 rounded-full'
                                                    style={{ backgroundColor: color }}
                                                ></div>
                                                <span
                                                    className={
                                                        disabledTypes.has(type)
                                                            ? 'line-through'
                                                            : ''
                                                    }
                                                >
                                                    {type}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

        </div>
    );
}
