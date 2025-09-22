import { useState } from 'react';
import GraphLegend from './GraphLegend';
import GraphSettings from './GraphSettings';

export default function GraphControl({
    settingsProps,
    SearchComponent,
    addNodes,
    addEdges,
    nodes,
    edges,
}) {
    const [graphStats, setGraphStats] = useState({
        nodes: 0,
        edges: 0,
        perCategory: {},
        legend: {},
    });

    const [disabledTypes, setDisabledTypes] = useState(new Set());
    const toggleDisabledType = (type) => {
        setDisabledTypes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(type)) newSet.delete(type);
            else newSet.add(type);
            return newSet;
        });
    };

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
            <SearchComponent
                graphStats={graphStats}
                addEdges={addEdges}
                addNodes={addNodes}
            />
            <div className='border-b-2 border-b-zinc-400 dark:border-b-zinc-800 mt-4 mx-2' />
            <GraphSettings
                {...settingsProps}
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
}
