import React, { useCallback, useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { getGraphData } from '../../services/graphService/graphService';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate } from 'react-router-dom';
import { preprocessData } from '../../utils/graphUtils/graphUtils';
import Graph from '../Graph/Graph';
import { LinkTreeFlattener } from '../../utils/dashboardUtils/dashboardUtils';

export default function GraphComponent() {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [spacingCoefficient, setSpacingCoefficient] = useState(48);
    const [componentDistanceCoefficient, setComponentDistanceCoefficient] = useState(8);
    const [nodeRadiusCoefficient, setNodeRadiusCoefficient] = useState(4);
    const [centerGravity, setCenterGravity] = useState(0.05);
    const [showControls, setShowControls] = useState(false);
    const [is3DMode, setIs3DMode] = useState(true); // New state for 2D/3D mode
    const [entryGraphColors, setEntryGraphColors] = useState({});
    const [searchValue, setSearchValue] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [showLegend, setShowLegend] = useState(true);
    const navigate = useNavigate();

    const filterData = (searchValue, data) => {
        const matchedNodes = new Set(
            data.nodes.filter((node) =>
                node.label.toLowerCase().includes(searchValue.toLowerCase()),
            ),
        );
        if (matchedNodes.size === 0) return data;

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
        return { nodes: [...connectedNodes], links: filteredLinks };
    };

    const filterGraph = useCallback(
        (searchValue) => {
            if (!searchValue) {
                fetchGraphData();
                return;
            }
            setData(filterData(searchValue, data));
        },
        [data],
    );

    const fetchGraphData = useCallback(() => {
        getGraphData()
            .then((response) => {
                response.data.entries = LinkTreeFlattener.flatten(
                    response.data.entries,
                );
                const data = preprocessData(response.data);
                if (searchValue) setData(filterData(searchValue, data));
                else setData(data);
                setEntryGraphColors(response.data.colors);
            })
            .catch(displayError(setAlert, navigate));
    }, [setAlert, searchValue, navigate]);

    useEffect(() => {
        fetchGraphData();
    }, []);

    const refreshDisplay = useCallback(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full relative overflow-hidden text-white'>
                <Graph
                    data={data}
                    node_r={nodeRadiusCoefficient}
                    is3D={is3DMode}
                    spacingCoefficient={spacingCoefficient}
                    componentDistanceCoefficient={componentDistanceCoefficient}
                    centerGravity={centerGravity}
                />

                {/* Legend Box */}

                {showLegend && (
                    <div className='absolute bottom-4 right-4 p-4 w-fit bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md'>
                        <div className='grid grid-cols-2 gap-2 max-h-40 overflow-y-auto'>
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
                )}

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

                            {/*
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
                    */}

                            {/* 2D/3D Mode Toggle */}
                            <div className='flex flex-row space-x-2 items-center'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm w-full'>3D View:</span>
                                    <input
                                        type='checkbox'
                                        checked={is3DMode}
                                        onChange={(e) => setIs3DMode(e.target.checked)}
                                        className='toggle toggle-primary w-1/2'
                                    />
                                </label>
                            </div>

                            <div className='flex flex-row space-x-2 items-center'>
                                <label className='flex items-center justify-between space-x-2 w-full'>
                                    <span className='text-sm w-full'>Show Legend:</span>
                                    <input
                                        type='checkbox'
                                        checked={showLegend}
                                        onChange={(e) =>
                                            setShowLegend(e.target.checked)
                                        }
                                        className='toggle toggle-primary w-1/2'
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
