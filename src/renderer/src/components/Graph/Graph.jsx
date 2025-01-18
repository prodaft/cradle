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
    selectedLinks,
    setSelectedLinks,
    interestedNodes,
    setInterestedNodes,
    onLinkClick,
    labelSize,
    fgRef,
    linkWidth = 2,
    spacingCoefficient = 0,
    componentDistanceCoefficient = 0,
    centerGravity = 0,
}) {
    const { useState, useCallback, useEffect } = React;

    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const navigate = useNavigate();

    const handleNodeHover = (node) => {
        highlightNodes.clear();

        if (node) {
            highlightNodes.add(node);
        }

        setHighlightNodes(new Set(highlightNodes));
    };

    const handleLinkHover = (link) => {
        highlightLinks.clear();
        highlightNodes.clear();

        if (link) {
            highlightLinks.add(link);
            highlightNodes.add(link.source);
            highlightNodes.add(link.target);
        }

        setHighlightNodes(new Set(highlightNodes));
        setHighlightLinks(new Set(highlightLinks));
    };

    const handleLinkClick = (link) => {
        selectedLinks.clear();
        interestedNodes.clear();

        selectedLinks.add(link);
        setSelectedLinks(new Set(selectedLinks));
        setInterestedNodes(new Set([link.source.id, link.target.id]));
        onLinkClick(link);
    };

    const paintRing = useCallback(
        (node, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node_r * 1.25, 0, 2 * Math.PI, false);
            ctx.fillStyle =
                interestedNodes.has(node.id) && !highlightNodes.has(node)
                    ? 'red'
                    : 'orange';
            ctx.fill();
            if (!interestedNodes.has(node.id) || highlightNodes.has(node)) return;
            ctx.font = `${labelSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(
                node.label,
                node.x,
                node.y - node_r * 1.25 - labelSize / 2 - 1,
            );
        },
        [interestedNodes, node_r],
    );

    const GraphComponent = is3D ? ForceGraph3D : ForceGraph2D;

    return (
        <GraphComponent
            graphData={data}
            ref={fgRef}
            nodeRelSize={node_r}
            autoPauseRedraw={false}
            linkWidth={(link) =>
                highlightLinks.has(link) || selectedLinks.has(link)
                    ? linkWidth + 1
                    : linkWidth
            }
            linkColor={(link) =>
                highlightLinks.has(link)
                    ? 'orange'
                    : selectedLinks.has(link)
                      ? 'red'
                      : '#3A3A3A'
            }
            linkDirectionalParticles={(link) =>
                highlightLinks.has(link) || selectedLinks.has(link)
            } // Disable particles
            nodeCanvasObjectMode={(node) =>
                highlightNodes.has(node) || interestedNodes.has(node.id)
                    ? 'before'
                    : undefined
            }
            nodeLabel={(n) => n.label}
            backgroundColor='#151515'
            nodeCanvasObject={paintRing}
            onLinkHover={handleLinkHover}
            onNodeHover={handleNodeHover}
            onNodeClick={(node) => {
                navigate(createDashboardLink(node));
            }}
            onLinkClick={handleLinkClick}
        />
    );
}
