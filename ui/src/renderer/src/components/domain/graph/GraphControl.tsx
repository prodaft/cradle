import { EdgeRelation } from '@/services/cradle';
import { ComponentType } from 'react';
import GraphLegend from './GraphLegend';
import GraphSettings from './GraphSettings';

interface Node {
    id: string;
    [key: string]: any;
}

interface SearchComponentProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
}

interface GraphControlProps {
    settingsProps: any;
    SearchComponent: ComponentType<SearchComponentProps>;
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    setDisabledTypes: (types: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    addNodes: (nodes: Node[]) => void;
    addEdges: (edges: EdgeRelation[]) => void;
    nodes: Node[];
    edges: EdgeRelation[];
}

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
}: GraphControlProps) {
    const toggleDisabledType = (type: string) => {
        setDisabledTypes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(type)) newSet.delete(type);
            else newSet.add(type);
            return newSet;
        });
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
