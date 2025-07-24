import React, { useEffect, forwardRef } from 'react';
import { Search, RefreshDouble, Erase } from 'iconoir-react';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';

const GraphSettings = forwardRef(
    ({ graphStats, config, setConfig, resetGraphStats }, graphRef) => {
        const { isDarkMode } = useTheme();
        const handleSearchChange = (e) => {
            setConfig((prevConfig) => ({
                ...prevConfig,
                searchValue: e.target.value,
            }));
        };

        const handleSearch = () => {
            if (!graphRef.current) return;

            const query = config.searchValue?.toLowerCase().trim();
            if (!query) return;

            const graph = graphRef.current;

            // Deselect everything first
            graph.nodes().removeClass('highlighted');

            // Find matching nodes
            const matched = graph.nodes().filter((node) => {
                const label = node.data('label')?.toLowerCase();
                const id = node.id()?.toLowerCase();
                return label?.includes(query) || id?.includes(query);
            });

            matched.addClass('highlighted');

            if (matched.length > 0) {
                graph.fit(matched, 300); // Zoom to matched nodes with padding
            }
        };

        const handleClearGraph = () => {
            if (graphRef.current) graphRef.current.elements().remove();
            if (typeof resetGraphStats === 'function') resetGraphStats();
        };

        const handleResetLayout = () => {
            if (!graphRef.current) return;

            const graph = graphRef.current;

            if (config.layout === 'preset') {
                // Restore original positions for preset layout
                graph.nodes().forEach((node) => {
                    const origX = node.data('originalX');
                    const origY = node.data('originalY');

                    if (origX !== undefined && origY !== undefined) {
                        if (config.animateLayout) {
                            node.animate(
                                {
                                    position: { x: origX, y: origY },
                                },
                                {
                                    duration: 500,
                                    easing: 'ease-in-out',
                                },
                            );
                        } else {
                            node.position({ x: origX, y: origY });
                        }
                    }
                });
            }

            // Run the selected layout
            graph
                .layout({
                    name: config.layout,
                    animate: config.animateLayout,
                    animationDuration: 500,
                })
                .run();
        };

        useEffect(() => {
            if (!graphRef.current) return;

            const graph = graphRef.current;

            const minSize = 10 * config.nodeRadiusCoefficient;
            const maxSize = 30 * config.nodeRadiusCoefficient;

            graph.style([
                {
                    selector: 'node',
                    style: {
                        // Hide labels by default
                        label: config.showLabels ? 'data(label)' : '',
                        'text-opacity': config.showLabels ? 1 : 0,
                        'font-size': `${config.labelSizeCoefficient}px`,
                        'border-width': 1,
                        'border-color': isDarkMode ? '#333' : '#eee',
                        'background-color': 'data(color)',
                        // Make node size based on its degree (centrality)
                        width: `mapData(degree, 0, 10, ${minSize}, ${maxSize})`,
                        height: `mapData(degree, 0, 10, ${minSize}, ${maxSize})`,
                        color: isDarkMode ? 'white' : 'black',
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'text-background-color': isDarkMode ? '#333' : '#eee',
                        'text-background-opacity': 0.8,
                        'text-background-shape': 'roundrectangle',
                        'text-background-padding': '1px',
                    },
                },
                {
                    // Style for selected nodes
                    selector: 'node:selected, node.highlighted',
                    style: {
                        label: 'data(label)',
                        'text-opacity': 1,
                        'font-size': `${config.labelSizeCoefficient}px`,
                        'z-index': 9999,
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'text-background-color': isDarkMode ? '#333' : '#eee',
                        'text-background-opacity': 0.8,
                        'text-background-shape': 'roundrectangle',
                        'text-background-padding': '1px',
                        color: isDarkMode ? 'white' : 'black',
                        'border-width': 2,
                        'border-color': '#ffa500', // Orange highlight
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        width: config.linkWidthCoefficient,
                        'curve-style': 'bezier',
                    },
                },
                {
                    selector: 'edge:selected',
                    style: {
                        'line-color': 'orange',
                        width: config.linkWidthCoefficient + 1,
                        'target-arrow-color': 'orange',
                        'source-arrow-color': 'orange',
                    },
                },
            ]);
        }, [config, graphRef.current]);

        return (
            <div className='px-8 pt-3'>
                <div className='flex flex-wrap gap-2 mt-2'>
                    <span className='badge badge-outline-primary'>
                        Total Nodes: {graphStats.nodes}
                    </span>
                    <span className='badge badge-outline-primary'>
                        Total Edges: {graphStats.edges}
                    </span>
                </div>
                <div className='flex flex-row space-x-2 items-center w-full mt-4'>
                    <input
                        type='text'
                        className='input !max-w-full w-full dark:text-white flex-grow'
                        placeholder='Find in Local Graph...'
                        onChange={handleSearchChange}
                    />
                    <button
                        type='button'
                        title='Search local graph'
                        className='btn flex items-center'
                        onClick={handleSearch}
                    >
                        <Search />
                    </button>
                    <button
                        type='button'
                        title='Clear graph elements'
                        className='btn'
                        onClick={handleClearGraph}
                    >
                        <Erase />
                    </button>
                    <button
                        type='button'
                        title='Reset graph layout'
                        className='btn'
                        onClick={handleResetLayout}
                    >
                        <RefreshDouble />
                    </button>
                </div>
                <div className='mt-4 space-y-3 px-4'>
                    {[
                        {
                            label: 'Node Size',
                            value: config.nodeRadiusCoefficient,
                            min: 0.5,
                            max: 2,
                            step: 0.1,
                            key: 'nodeRadiusCoefficient',
                        },
                        {
                            label: 'Link Width',
                            value: config.linkWidthCoefficient,
                            min: 0.5,
                            max: 4,
                            step: 0.1,
                            key: 'linkWidthCoefficient',
                        },
                        ,
                        {
                            label: 'Label Size',
                            value: config.labelSizeCoefficient,
                            min: 4,
                            max: 16,
                            step: 1,
                            key: 'labelSizeCoefficient',
                        },
                    ].map(({ label, value, min, max, step, key }) => (
                        <div key={key} className='flex items-center'>
                            <label className='text-sm w-[12%]'>{label}</label>
                            <input
                                type='range'
                                min={min}
                                max={max}
                                step={step}
                                value={value}
                                onChange={(e) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        [key]: Number(e.target.value),
                                    }))
                                }
                                className='range range-primary flex-1'
                            />
                            <input
                                type='number'
                                min={min}
                                max={max}
                                step={step}
                                value={value}
                                onChange={(e) =>
                                    setConfig((prev) => ({
                                        ...prev,
                                        [key]: Number(e.target.value),
                                    }))
                                }
                                className='input input-sm w-16 ml-2'
                            />
                        </div>
                    ))}

                    <div className='flex items-center'>
                        <label className='text-sm mr-3'>Layout</label>
                        <select
                            className='select select-sm w-40'
                            value={config.layout}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    layout: e.target.value,
                                }))
                            }
                        >
                            <option value='preset'>Preset</option>
                            <option value='grid'>Grid</option>
                            <option value='cose'>Cose</option>
                            <option value='breadthfirst'>Breadthfirst</option>
                        </select>
                        <label className='text-sm ml-auto mr-2'>Labels</label>
                        <input
                            type='checkbox'
                            className='checkbox'
                            checked={config.showLabels}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    showLabels: e.target.checked,
                                }))
                            }
                        />
                        <label className='text-sm ml-3 mr-2'>Animate</label>
                        <input
                            type='checkbox'
                            className='checkbox'
                            checked={config.animateLayout}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    animateLayout: e.target.checked,
                                }))
                            }
                        />
                    </div>
                </div>
            </div>
        );
    },
);

export default GraphSettings;
