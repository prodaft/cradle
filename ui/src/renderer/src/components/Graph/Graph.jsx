import { Cosmograph, CosmographProvider, CosmographSearch } from '@cosmograph/react';
import { Erase, PauseSolid, PlaySolid, RefreshDouble } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

function normalize(x, inputMin, inputMax) {
    x = Math.min(x, inputMax);
    x = Math.max(x, inputMin);
    const outputMin = 2, outputMax = 10;

    const shifted = x - inputMin + 1;
    const maxShifted = inputMax - inputMin + 1;

    const normalized = shifted / maxShifted;
    return outputMin + normalized * (outputMax - outputMin);
}

export default function GraphViewer({ setSelectedEntries, config = {}, nodes = [], edges = [], onClearGraph }) {
    const [selectedNodes, setSelectedNodes] = useState([]);
    const { isDarkMode } = useTheme();
    const cosmographRef = useRef(null);
    const { navigate, navigateLink } = useCradleNavigate();
    const [disableSimulation, setDisableSimulation] = useState(false);
    const [graphInstanceKey, setGraphInstanceKey] = useState(0);

    let onClick = (node, index, nodePosition, event) => {
        if (!node) {
            setSelectedNodes([]);
            cosmographRef.current.focusNode(null);
            return;
        }

        let clickedNodes = [node];
        if (
            cosmographRef.current != null &&
            selectedNodes.filter((n) => n.id === node.id).length === 1
        ) {
            clickedNodes =
                cosmographRef.current.getAdjacentNodes(node.id) || clickedNodes;
        }

        let newNodes = [node];
        if (event.ctrlKey || event.metaKey) {
            newNodes = [...selectedNodes];
        }

        for (let n of clickedNodes) {
            if (newNodes.filter((sn) => sn.id === n.id).length === 0) {
                newNodes.push(n);
            }
        }
        cosmographRef.current.focusNode(node);
        setSelectedNodes(newNodes);
    };
    useEffect(() => {
        if (cosmographRef.current == null) return;
        if (disableSimulation) {
            cosmographRef.current.pause();
        } else {
            cosmographRef.current.start();
        }
    }, [disableSimulation]);

    useEffect(() => {
        setSelectedEntries(new Set(selectedNodes));
        if (!cosmographRef.current) return;
        if (selectedNodes.length === 0) {
            cosmographRef.current.unselectNodes();
        } else {
            cosmographRef.current.selectNodes(selectedNodes);
        }
    }, [selectedNodes]);

    return (
        <div
            style={{
                width: '100%',
                height: '100vh',
                backgroundColor: isDarkMode ? '#151515' : '#f9f9f9',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <CosmographProvider>
                <div className='absolute top-2 right-2 z-10 flex items-center gap-2 cradle-bg-elevated cradle-border px-3 py-2'>
                    <CosmographSearch
                        accessors={[
                            {
                                label: 'label',
                                accessor: (node) => node.label,
                            },
                        ]}
                        onSelectResult={(node) => {
                            if (node == null || cosmographRef.current == null) return;
                            cosmographRef.current.focusNode(node);
                            cosmographRef.current.zoomToNode(node);
                            setSelectedNodes([node]);

                        }}
                    />
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Clear graph elements'
                        onClick={() => onClearGraph && onClearGraph()}
                    >
                        <Erase />
                    </button>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Toggle simulation'
                        onClick={() => setDisableSimulation(!disableSimulation)}
                    >
                        {disableSimulation ? <PlaySolid /> : <PauseSolid />}
                    </button>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Refresh graph'
                        onClick={() => setGraphInstanceKey((k) => k + 1)}
                    >
                        <RefreshDouble />
                    </button>
                </div>
                <Cosmograph
                    key={graphInstanceKey}
                    nodes={nodes}
                    links={edges}
                    ref={cosmographRef}
                    onClick={onClick}
                    backgroundColor={isDarkMode ? '#151515' : '#f9f9f9'}
                    nodeColor={(node) => node.color || '#4A90E2'}
                    nodeLabelAccessor={(node) => node.label || node.id}
                    nodeGreyoutOpacity={0.1}
                    nodeSizeScale={(typeof config.nodeRadiusCoefficient === 'number'
                        ? config.nodeRadiusCoefficient
                        : 1)}
                    nodeSize={(node) => normalize(node.degree || 1, 1, 60)}
                    showDynamicLabels={true}
                    nodeLabel={(node) => node.label || node.id}
                    disableSimulation={false}
                    linkColor='#999999'
                    focusedNodeRingColor="#f68d2e"
                    linkWidth={2}
                    linkWidthScale={(typeof config.linkWidthCoefficient === 'number'
                        ? config.linkWidthCoefficient
                        : 1)}
                    simulationGravity={
                        typeof config.simulationGravity === 'number'
                            ? config.simulationGravity
                            : 0.2
                    } /* 0.0 - 1.0 */
                    simulationRepulsion={
                        typeof config.simulationRepulsion === 'number'
                            ? config.simulationRepulsion
                            : 1.5
                    } /* 0.3 - 2.0 */
                    simulationLinkSpring={
                        typeof config.simulationLinkSpring === 'number'
                            ? config.simulationLinkSpring
                            : 0.5
                    } /* 0.0 - 2.0 */
                    simulationLinkDistance={
                        typeof config.simulationLinkDistance === 'number'
                            ? config.simulationLinkDistance
                            : 10
                    } /* 0 - 20 */
                    curvedLinks={false}
                    arrows={false}
                    arrowSizeScale={0}
                />
            </CosmographProvider>
        </div>
    );
}
