import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { getGraphData } from '../../services/graphService/graphService';
import { Menu, RefreshDouble, Search, Xmark } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate } from 'react-router-dom';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import {
    preprocessData,
    visualizeGraphCanvas,
} from '../../utils/graphUtils/graphUtils';
import { entryGraphColors } from '../../utils/entryDefinitions/entryDefinitions';

/**
 * The component displays a graph visualization using D3.js.
 * The graph is rendered using a canvas element and D3.js force simulation.
 * The component fetches the graph data from the server and preprocesses it before rendering the graph.
 * The component also provides controls to adjust the graph layout and search for nodes.
 *
 * @function GraphComponent
 * @returns {GraphComponent}
 * @constructor
 */
export default function GraphComponent() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const defaultStrokeWidth = 2;
    const [spacingCoefficient, setSpacingCoefficient] = useState(48);
    const [componentDistanceCoefficient, setComponentDistanceCoefficient] = useState(8);
    const [nodeRadiusCoefficient, setNodeRadiusCoefficient] = useState(1.5);
    const [centerGravity, setCenterGravity] = useState(0.05);
    const [showControls, setShowControls] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [highlightedNode, setHighlightedNode] = useState(null);
    const navigate = useNavigate();

    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const simulation = useRef();

    // Function to adjust the canvas size and scale for high DPI screens
    const setCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const context = canvas.getContext('2d');
            context.scale(dpr, dpr);

            contextRef.current = context;
        }
    }, []);

    useEffect(() => {
        setCanvasSize();

        const handleResize = () => {
            setCanvasSize();
            renderGraph(data);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [data, setCanvasSize]);

    const renderGraph = useCallback(
        (data) => {
            if (contextRef.current) {
                visualizeGraphCanvas(
                    data,
                    contextRef.current,
                    canvasRef.current,
                    setHighlightedNode,
                    simulation,
                    nodeRadiusCoefficient,
                    spacingCoefficient,
                    componentDistanceCoefficient,
                    centerGravity,
                );
            }
        },
        [
            defaultStrokeWidth,
            nodeRadiusCoefficient,
            spacingCoefficient,
            componentDistanceCoefficient,
            centerGravity,
        ],
    );

    const filterGraph = useCallback(
        (searchValue) => {
            if (!searchValue) {
                renderGraph(data);
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

            renderGraph({ nodes: [...connectedNodes], links: filteredLinks });
        },
        [data, renderGraph],
    );

    const fetchGraphData = useCallback(() => {
        getGraphData()
            .then((response) => {
                const data = preprocessData(response.data);
                setData(data);
                renderGraph(data);
            })
            .catch(displayError(setAlert, navigate));
    }, [setAlert]);

    useEffect(() => {
        fetchGraphData();
    }, []);

    useEffect(() => {
        renderGraph(data);
    }, [renderGraph, data]);

    const refreshDisplay = useCallback(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full relative overflow-hidden text-white'>
                {/* Legend Box */}
                <div className='absolute bottom-4 right-4 flex flex-col p-4 w-fit h-fit space-y-1 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md'>
                    <div className='flex flex-col'>
                        {Object.entries(entryGraphColors).map(([type, color]) => (
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

                {/* Node Info Box */}
                <div className='absolute top-4 left-4 w-fit h-fit'>
                    {highlightedNode && (
                        <div className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg p-4 rounded-md w-96 max-h-[90vh] flex flex-col space-y-2'>
                            <div className='flex flex-row items-start justify-between space-x-4'>
                                <p className='text-xl font-bold max-h-[75vh] overflow-hidden break-all'>
                                    <span className='text-l text-zinc-300'>
                                        {highlightedNode.subtype
                                            ? highlightedNode.subtype + ': '
                                            : highlightedNode.type + ': '}
                                    </span>
                                    {highlightedNode.name}
                                </p>
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
                            {highlightedNode.type !== 'metadata' && (
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
                            )}
                        </div>
                    )}
                </div>

                {/* Controls Toggle Button */}
                <div className='absolute top-4 right-4'>
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg text-white p-2 rounded'
                        data-testid='toggle-controls'
                    >
                        <Menu height='1.2em' width='1.2em' className='text-zinc-300' />
                    </button>
                </div>

                {/* Controls Panel */}
                {showControls && (
                    <div className='absolute top-4 right-16 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md p-4 shadow-lg z-10 w-96'>
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
                                        min='1'
                                        max='10'
                                        step='0.5'
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

                {/* Graph Canvas */}
                <div className='w-full h-full'>
                    <canvas ref={canvasRef} className='w-full h-full'></canvas>
                </div>
            </div>
        </>
    );
}
