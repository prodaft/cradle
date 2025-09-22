import { Cosmograph, CosmographProvider, CosmographSearch } from '@cosmograph/react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

export default function GraphViewer({ config = {}, nodes = [], edges = [] }) {
    const [selectedNodes, setSelectedNodes] = useState([]);
    const { isDarkMode } = useTheme();
    const cosmographRef = useRef(null);
    const { navigate, navigateLink } = useCradleNavigate();

    let onClick = (node, index, nodePosition, event) => {
        if (!node) {
            setSelectedNodes([]);
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
        setSelectedNodes(newNodes);
    };

    useEffect(() => {
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
                <CosmographSearch />
                <Cosmograph
                    nodes={nodes}
                    links={edges}
                    ref={cosmographRef}
                    onClick={onClick}
                    backgroundColor={isDarkMode ? '#151515' : '#f9f9f9'}
                    nodeColor={(node) => node.color || '#4A90E2'}
                    nodeLabelAccessor={(node) => node.label || node.id}
                    nodeGreyoutOpacity={0.1}
                    nodeSize={(node) => Math.min(8, Math.max(2, node.degree))}
                    showDynamicLabels={true}
                    nodeLabel={(node) => node.label || node.id}
                    disableSimulation={false}
                    linkColor={'#888888'}
                    linkWidth={2}
                    simulationGravity={0.2} /* 0.0 - 1.0 */
                    simulationRepulsion={1.5} /* 0.3 - 2.0 */
                    simulationLinkSpring={0.5} /* 0.0 - 2.0 */
                    simulationLinkDistance={10} /* 0 - 20 */
                    curvedLinks={false}
                    arrows={true}
                    arrowSizeScale={2}
                />
            </CosmographProvider>
        </div>
    );
}
