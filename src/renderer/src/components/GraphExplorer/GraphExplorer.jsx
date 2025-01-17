import React, { useCallback, useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { useNavigate } from 'react-router-dom';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';

export default function GraphExplorer() {
    const [data, setData] = useState({
        nodes: [],
        links: [],
    });
    const [spacingCoefficient, setSpacingCoefficient] = useState(48);
    const [componentDistanceCoefficient, setComponentDistanceCoefficient] = useState(8);
    const [nodeRadiusCoefficient, setNodeRadiusCoefficient] = useState(4);
    const [centerGravity, setCenterGravity] = useState(0.05);
    const [showControls, setShowControls] = useState(false);
    const [is3DMode, setIs3DMode] = useState(false);
    const [entryGraphColors, setEntryGraphColors] = useState(null);
    const [cache, setCache] = useState({ nodes: new Set(), links: new Set() });
    const [searchValue, setSearchValue] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [showLegend, setShowLegend] = useState(true);
    const navigate = useNavigate();
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [notesQuery, setNotesQuery] = useState(null);

    const filterGraph = useCallback((searchValue) => {}, [data]);

    const refreshDisplay = useEffect(() => {
        setData({ nodes: [], links: [] });
        setCache({ nodes: new Set(), links: new Set() });
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
    }, []);

    return (
        <>
            <div className='w-full h-full rounded-md flex p-1.5 gap-1.5 flex-row overflow-y-hidden relative'>
                <AlertDismissible alert={alert} setAlert={setAlert} />
                <div className='h-full w-1/3 bg-gray-2 rounded-md'>
                    <GraphQuery
                        setAlert={setAlert}
                        graphData={data}
                        setGraphData={setData}
                        entryColors={entryGraphColors}
                        setEntryColors={setEntryGraphColors}
                        cache={cache}
                        setCache={setCache}
                        setHighlightedLinks={setHighlightLinks}
                        notesQuery={notesQuery}
                    />
                </div>
                <div className='h-full w-2/3 bg-gray-2 rounded-md overflow-hidden'>
                    <div>
                        <Graph
                            data={data}
                            node_r={nodeRadiusCoefficient}
                            is3D={is3DMode}
                            spacingCoefficient={spacingCoefficient}
                            componentDistanceCoefficient={componentDistanceCoefficient}
                            centerGravity={centerGravity}
                            highlightLinks={highlightLinks}
                            setHighlightLinks={setHighlightLinks}
                            highlightNodes={highlightNodes}
                            setHighlightNodes={setHighlightNodes}
                            onLinkClick={(link) => {
                                setNotesQuery({
                                    references: [link.source.id, link.target.id],
                                });
                            }}
                        />

                        {entryGraphColors && showLegend && (
                            <div className='absolute bottom-4 right-4 p-4 w-fit bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md'>
                                <div className='grid grid-cols-2 gap-2 max-h-40 overflow-y-auto'>
                                    {Object.entries(entryGraphColors).map(
                                        ([type, color]) => (
                                            <div
                                                key={type}
                                                className='flex flex-row items-center space-x-2'
                                            >
                                                <div
                                                    className='w-4 h-4 rounded-full'
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                ></div>
                                                <span>{type}</span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        <div className='absolute top-4 right-4'>
                            <button
                                onClick={() => setShowControls(!showControls)}
                                className='bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg text-white p-2 rounded'
                                data-testid='toggle-controls'
                            >
                                <Menu
                                    height='1.2em'
                                    width='1.2em'
                                    className='text-zinc-300'
                                />
                            </button>
                        </div>

                        {showControls && (
                            <div className='absolute top-4 right-16 bg-cradle3 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-md p-4 shadow-lg z-10 w-96'>
                                <div className='flex flex-col space-y-4'>
                                    <div className='flex flex-row space-x-2 items-center'>
                                        <input
                                            type='text'
                                            className='input input-ghost-primary input-md text-white'
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

                                    <div className='flex flex-row space-x-2 items-center'>
                                        <label className='flex items-center justify-between space-x-2 w-full'>
                                            <span className='text-sm w-full'>
                                                3D View:
                                            </span>
                                            <input
                                                type='checkbox'
                                                checked={is3DMode}
                                                onChange={(e) =>
                                                    setIs3DMode(e.target.checked)
                                                }
                                                className='toggle toggle-primary w-1/2'
                                            />
                                        </label>
                                    </div>

                                    <div className='flex flex-row space-x-2 items-center'>
                                        <label className='flex items-center justify-between space-x-2 w-full'>
                                            <span className='text-sm w-full'>
                                                Show Legend:
                                            </span>
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
                </div>
            </div>
        </>
    );
}
