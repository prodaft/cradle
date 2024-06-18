import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'tailwindcss/tailwind.css';
import { getGraphData } from '../../services/graphService/graphService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { Menu, RefreshDouble, Search, Xmark } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate } from 'react-router-dom';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import {
    preprocessData,
    entityColors,
    visualizeGraph,
} from '../../utils/graphUtils/graphUtils';

/**
 * The component displays a graph visualization using D3.js.
 * The graph is rendered using an SVG element and D3.js force simulation.
 * The component fetches the graph data from the server and preprocesses it before rendering the graph.
 * The component also provides controls to adjust the graph layout and search for nodes.
 * The component provides controls for:
 * - Node spacing - The spacing between nodes, which affects the overall size of the graph, based on the number of nodes
 * - Node size - Multiplier for the node radius, which is based on the node degree
 * - Component spacing - The spacing between components in the graph, which affects the overall size of the graph, based on the number of components
 * - Gravitational force - The power of the center gravity, which affects how much the nodes are attracted to the center of the screen.
 * The component also provides a search input to focus on a specific node in the graph.
 * When searching for a node, the graph is filtered to show only the first node that matches the search query and its first-degree connections.
 * The component also provides a button to refresh the graph display, which fetches the latest graph data from the server.
 * The component also provides a button to show/hide the controls for adjusting the graph layout.
 * When hovering over a node, the component highlights the node and its first-degree connections.
 * When hovering over an edge, the component highlights the edge and its source and target nodes.
 * When clicking on a node, the component displays a panel with information about the node and provides a link to navigate to the node's dashboard.
 *
 * @returns {GraphComponent}
 * @constructor
 */
const GraphComponent = () => {
    const [data, setData] = useState({ nodes: [], links: [] });
    const defaultStrokeWidth = 2;
    const [spacingCoefficient, setSpacingCoefficient] = useState(48);
    const [componentDistanceCoefficient, setComponentDistanceCoefficient] = useState(8);
    const [nodeRadiusCoefficient, setNodeRadiusCoefficient] = useState(2);
    const [centerGravity, setCenterGravity] = useState(0.05);
    const [showControls, setShowControls] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [highlightedNode, setHighlightedNode] = useState(null);
    const auth = useAuth();
    const navigate = useNavigate();

    // Reference to the SVG element used to render the graph
    // D3.js uses svg elements to render graphics, the svg element is used to render the graph
    const svgRef = useRef();

    // Reference to the D3 force simulation, used to update the graph layout
    const simulation = useRef();

    // Function to render the graph using D3.js
    const renderGraph = useCallback(
        (data) =>
            visualizeGraph(
                data,
                svgRef,
                setHighlightedNode,
                simulation,
                nodeRadiusCoefficient,
                spacingCoefficient,
                componentDistanceCoefficient,
                centerGravity,
            ),
        [
            defaultStrokeWidth,
            nodeRadiusCoefficient,
            spacingCoefficient,
            componentDistanceCoefficient,
            centerGravity,
            svgRef,
        ],
    );

    // Function to fetch the graph data from the server
    const fetchGraphData = useCallback(() => {
        getGraphData(auth.access)
            .then((response) => {
                const data = preprocessData(response.data);
                setData(data);
            })
            .catch(displayError(setAlert));
    }, [auth.access, setAlert]);

    // Fetch the graph data on component mount
    useEffect(() => {
        fetchGraphData();
    }, []);

    // Render the graph when the data changes
    useEffect(() => {
        renderGraph(data, svgRef);
    }, [renderGraph, data, svgRef]);

    // Function to refresh the graph display
    const refreshDisplay = useCallback(() => {
        fetchGraphData();
    }, [data, svgRef, renderGraph]);

    // Function to filter the nodes in the graph based on the search query
    // Only shows the nodes whose labels contain the search query and their first-degree connections
    const filterGraph = useCallback(
        (searchValue) => {
            if (!searchValue) {
                renderGraph(data, svgRef);
                return;
            }
            const matchedNodes = new Set(
                data.nodes.filter((node) =>
                    node.label.toLowerCase().includes(searchValue.toLowerCase()),
                ),
            );
            if (matchedNodes.size === 0) return;

            const connectedNodes = new Set(matchedNodes);

            const filteredLinks = [];
            data.links.forEach((link) => {
                if (matchedNodes.has(link.source)) {
                    connectedNodes.add(link.target);
                    filteredLinks.push(link);
                } else if (matchedNodes.has(link.target)) {
                    connectedNodes.add(link.source);
                    filteredLinks.push(link);
                }
            });

            renderGraph({ nodes: [...connectedNodes], links: filteredLinks }, svgRef);
        },
        [data, svgRef, renderGraph],
    );

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full relative overflow-hidden text-white'>
                <div className='absolute bottom-4 right-4 flex flex-col p-4 w-fit h-fit space-y-1 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md'>
                    <div className='flex flex-col'>
                        {Object.entries(entityColors).map(([type, color]) => (
                            <div
                                key={type}
                                className='flex flex-row items-center space-x-2'
                            >
                                <div
                                    className='w-4 h-4 rounded-full'
                                    style={{ backgroundColor: color }}
                                ></div>
                                <span>{type}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className='absolute top-4 left-4 w-fit h-fit'>
                    {highlightedNode && (
                        <div className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg p-4 rounded-md min-w-96 flex flex-col space-y-2'>
                            <div className='flex flex-row items-center justify-between space-x-4'>
                                <h2 className='text-xl font-bold'>
                                    {highlightedNode.label}
                                </h2>
                                <button
                                    onClick={() => setHighlightedNode(null)}
                                    className='w-fit h-fit'
                                >
                                    <Xmark
                                        height='1.2em'
                                        width='1.2em'
                                        className='text-zinc-400'
                                    />
                                </button>
                            </div>
                            <div>Connections: {highlightedNode.degree}</div>
                            <div
                                className='underline cursor-pointer'
                                onClick={() =>
                                    navigate(
                                        createDashboardLink({
                                            name: highlightedNode.name,
                                            type: highlightedNode.type,
                                            subtype: highlightedNode.subtype,
                                        }),
                                    )
                                }
                            >
                                Navigate to dashboard
                            </div>
                        </div>
                    )}
                </div>
                <div className='absolute top-4 right-4'>
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg text-white p-2 rounded'
                        data-testid='toggle-controls'
                    >
                        <Menu height='1.2em' width='1.2em' className='text-zinc-400' />
                    </button>
                </div>
                {showControls && (
                    <div className='absolute top-4 right-16 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md p-4 shadow-lg z-10 w-96 '>
                        <div className='flex flex-col space-y-4'>
                            <div className='flex flex-row space-x-2 items-center'>
                                <input
                                    type='text'
                                    className='input input-ghost-primary input-md text-white'
                                    placeholder='Search Graph'
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') filterGraph(searchValue);
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
                            <div className='flex flex-row space-x-2 w-full'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm'>Node Spacing:</span>
                                    <input
                                        type='range'
                                        min='0'
                                        max='128'
                                        step='16'
                                        value={spacingCoefficient}
                                        className='range range-primary'
                                        onChange={(e) => {
                                            setSpacingCoefficient(
                                                Number(e.target.value),
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                            <div className='flex flex-row space-x-2 w-full'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm'>Node Size:</span>
                                    <input
                                        type='range'
                                        min='0'
                                        max='10'
                                        step='1'
                                        className='range range-primary'
                                        value={nodeRadiusCoefficient}
                                        onChange={(e) => {
                                            setNodeRadiusCoefficient(
                                                Number(e.target.value),
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                            <div className='flex flex-row space-x-2 w-full'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm'>Component Spacing:</span>
                                    <input
                                        type='range'
                                        min='0'
                                        max='32'
                                        step='4'
                                        className='range range-primary'
                                        value={componentDistanceCoefficient}
                                        onChange={(e) => {
                                            setComponentDistanceCoefficient(
                                                Number(e.target.value),
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                            <div className='flex flex-row space-x-2 w-full'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm'>
                                        Gravitational Force:
                                    </span>
                                    <input
                                        type='range'
                                        min='0'
                                        max='0.25'
                                        step='0.025'
                                        className='range range-primary'
                                        value={centerGravity}
                                        onChange={(e) => {
                                            setCenterGravity(Number(e.target.value));
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
                <div className='w-full h-full'>
                    <svg ref={svgRef} className='w-full h-full'></svg>
                </div>
            </div>
        </>
    );
};

export default GraphComponent;
