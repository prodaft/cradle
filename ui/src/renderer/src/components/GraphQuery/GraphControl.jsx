import GraphLegend from './GraphLegend';
import GraphSettings from './GraphSettings';

export default function GraphControl({
    settingsProps,
    SearchComponent,
    entryGraphColors,
    disabledTypes,
    setDisabledTypes,
    addNodes,
    addEdges,
    nodes,
    edges,
}) {
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
                addEdges={addEdges}
                addNodes={addNodes}
            />
            <div className='border-b-2 border-b-zinc-400 dark:border-b-zinc-800 mt-4 mx-2' />
            <GraphSettings
                {...settingsProps}
                nodes={nodes}
                edges={edges}
                resetGraphStats={resetGraphStats}
            />
            <div className='border-b-2  border-b-zinc-400 dark:border-b-zinc-800 mt-4 mx-2' />
            <GraphLegend
                entryGraphColors={entryGraphColors}
                disabledTypes={disabledTypes}
                toggleDisabledType={toggleDisabledType}
                setDisabledTypes={setDisabledTypes}
            />
        </>
    );
}
