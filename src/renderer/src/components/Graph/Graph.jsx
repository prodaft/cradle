import React from 'react';
import 'tailwindcss/tailwind.css';
import { ForceGraph2D, ForceGraph3D } from 'react-force-graph';
import { useNavigate } from 'react-router-dom';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * The component displays a graph visualization using D3.js.
 * The graph is rendered using a canvas element and D3.js force simulation.
 * The component fetches the graph data from the server and preprocesses it before rendering the graph.
 * The component also provides controls to adjust the graph layout and search for nodes.
 *
 * @function Graph
 * @returns {Graph}
 * @constructor
 */
export default function Graph({
    data,
    node_r,
    is3D,
    spacingCoefficient = 0,
    componentDistanceCoefficient = 0,
    centerGravity = 0,
}) {
    const { useState, useCallback, useEffect } = React;
    const navigate = useNavigate();

    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);

    const updateHighlight = () => {
        setHighlightNodes(new Set(highlightNodes));
        setHighlightLinks(new Set(highlightLinks));
    };

    const handleNodeHover = (node) => {
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
            highlightNodes.add(node);
            node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor));
            node.links.forEach((link) => highlightLinks.add(link));
        }

        setHoverNode(node || null);
        updateHighlight();
    };

    const handleLinkHover = (link) => {
        highlightNodes.clear();
        highlightLinks.clear();

        if (link) {
            highlightLinks.add(link);
            highlightNodes.add(link.source);
            highlightNodes.add(link.target);
        }

        updateHighlight();
    };

    const paintRing = useCallback(
        (node, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node_r * 1.25, 0, 2 * Math.PI, false);
            ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
            ctx.fill();
        },
        [hoverNode, node_r],
    );

    const GraphComponent = is3D ? ForceGraph3D : ForceGraph2D;

    return (
        <GraphComponent
            graphData={data}
            nodeRelSize={node_r}
            autoPauseRedraw={false}
            linkWidth={(link) => (highlightLinks.has(link) ? 2 : 1)}
            linkColor={(link) => (highlightLinks.has(link) ? 'orange' : '#71717A')}
            linkDirectionalParticles={0} // Disable particles
            nodeCanvasObjectMode={(node) =>
                highlightNodes.has(node) ? 'before' : undefined
            }
            nodeLabel={(n) => `${n.subtype ? n.subtype + ': ' : ''}${n.name}`}
            nodeCanvasObject={paintRing}
            backgroundColor='#151515'
            onNodeHover={handleNodeHover}
            onLinkHover={handleLinkHover}
            onNodeClick={(node) => {
                navigate(createDashboardLink(node));
            }}
        />
    );
}
