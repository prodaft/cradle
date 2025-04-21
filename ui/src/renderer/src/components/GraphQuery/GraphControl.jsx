import React, { forwardRef, useEffect, useState } from 'react';
import GraphSearch from './GraphSearch';
import GraphSettings from './GraphSettings';
import GraphLegend from './GraphLegend';

const GraphControl = forwardRef(({ settingsProps }, graphRef) => {
    const [graphStats, setGraphStats] = useState({
        nodes: 0,
        edges: 0,
        perCategory: {},
        legend: {},
    });

    const processNewNode = (node) => {
        setGraphStats((prev) => {
            const newNodesCount = prev.nodes + 1;
            const newPerCategory = { ...prev.perCategory };
            if (node.subtype) {
                newPerCategory[node.subtype] = (newPerCategory[node.subtype] || 0) + 1;
            }
            const newLegend = { ...prev.legend };
            if (node.subtype && node.color && !newLegend[node.subtype]) {
                newLegend[node.subtype] = node.color;
            }
            return {
                ...prev,
                nodes: newNodesCount,
                perCategory: newPerCategory,
                legend: newLegend,
            };
        });
    };

    const addEdge = (n) => {
        setGraphStats((prev) => {
            return {
                ...prev,
                edges: prev.edges + n,
            };
        });
    };

    const [disabledTypes, setDisabledTypes] = useState(new Set());
    const toggleDisabledType = (type) => {
        setDisabledTypes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(type)) newSet.delete(type);
            else newSet.add(type);
            return newSet;
        });
    };

    useEffect(() => {
        if (!graphRef.current) return;

        const graph = graphRef.current;
        const disabled = new Set(disabledTypes);

        graph.nodes().forEach((node) => {
            const subtype = node.data('subtype');
            node.style('display', disabled.has(subtype) ? 'none' : 'element');
        });

        graph.edges().forEach((edge) => {
            const sourceNode = graph.getElementById(edge.data('source'));
            const targetNode = graph.getElementById(edge.data('target'));
            const hidden =
                sourceNode.style('display') === 'none' ||
                targetNode.style('display') === 'none';
            edge.style('display', hidden ? 'none' : 'element');
        });
    }, [disabledTypes, graphRef]);

    const resetGraphStats = () => {
        setGraphStats({
            nodes: 0,
            edges: 0,
            perCategory: {},
            legend: {},
        });
        setDisabledTypes(new Set());
    };

    return (
        <>
            <GraphSearch
                ref={graphRef}
                graphStats={graphStats}
                processNewNode={processNewNode}
                addEdge={addEdge}
            />
            <div className='border-b-2 border-b-zinc-400 dark:border-b-zinc-800 mt-4 mx-2' />
            <GraphSettings
                {...settingsProps}
                ref={graphRef}
                graphStats={graphStats}
                resetGraphStats={resetGraphStats}
            />
            <div className='border-b-2  border-b-zinc-400 dark:border-b-zinc-800 mt-4 mx-2' />
            <GraphLegend
                entryGraphColors={graphStats.legend}
                disabledTypes={disabledTypes}
                toggleDisabledType={toggleDisabledType}
                setDisabledTypes={setDisabledTypes}
            />
        </>
    );
});

export default GraphControl;
