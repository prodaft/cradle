import * as d3 from 'd3';
import { entryGraphColors } from '../entryDefinitions/entryDefinitions';
import { truncateText } from '../dashboardUtils/dashboardUtils';

/**
 * preprocessData - This function is used to preprocess the raw data into a format suitable for the D3 force simulation.
 * The function is used in the GraphComponent component to preprocess the data before rendering the graph.
 * The function maps over the entries in the data and creates a new node for each entry with the necessary properties.
 * The function also calculates the degree of each node (i.e., the number of links connected to the node).
 * Labels are truncated to 40 characters.
 *
 * @function preprocessData
 * @param {
 *     {
 *          entries: Array<GraphEntry>,
 *          links: Array<GraphLink>
 *     }
 *     } data - The raw data to be preprocessed. The data should have a 'entries' property and a 'links' property.
 * @returns {
 *      {
 *          nodes: Array<GraphNode>,
 *          links: Array<GraphLink>
 *      }
 *      } The preprocessed data, containing an array of nodes and an array of links.
 */

const DEFAULT_BORDER = '#71717a';
const DEFAULT_SELECT = '#f68d2e';
const DEFAULT_RADIUS = 5;
const LABEL_ZOOM_MIN = 3;

export const preprocessData = (data) => {
    // Initialize an empty array for the nodes
    let nodes = [];
    // Get the links from the data
    let links = data.links;

    // Map over the entries in the data and create a new node for each entry
    nodes = data.entries.map((entry) => ({
        id: entry.id,
        label: entry.subtype
            ? truncateText(`${entry.subtype}: ${entry.name}`, 40)
            : truncateText(`${entry.type}: ${entry.name}`, 40),
        color: entryGraphColors[entry.type],
        name: entry.name,
        type: entry.type,
        subtype: entry.subtype,
        degree: 0,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
    }));

    // Initialize an empty object to store the degrees of the nodes
    const nodesDegrees = {};
    // Calculate the degree of each node (i.e., the number of links connected to the node)
    links.forEach((link) => {
        nodesDegrees[link.source] = (nodesDegrees[link.source] || 0) + 1;
        nodesDegrees[link.target] = (nodesDegrees[link.target] || 0) + 1;
    });

    // Assign the calculated degree to each node
    nodes.forEach((node) => {
        node.degree = nodesDegrees[node.id] || 0;
    });

    // Return the preprocessed data
    return { nodes, links };
};

function connected(node, link) {
    if (node === null || link === null) return false;
    return link.source.id === node.id || link.target.id === node.id;
}

function interpolate(x1, x2, y1, y2, x) {
    if (x1 === x2) return (y1 + y2) / 2;
    return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

export const visualizeGraph = (
    data,
    svgRef,
    setHighlightedNode,
    simulation,
    nodeRadiusCoefficient,
    spacingCoefficient,
    componentDistanceCoefficient,
    centerGravity,
) => {
    // Set up the SVG element and container
    const svg = d3.select(svgRef.current);
    const container = svg.node().parentElement;

    const defaultStrokeWidth = 2;

    // Clear the SVG element, make sure previously rendered graph is removed
    svg.selectAll('*').remove();

    // Set the width and height of the SVG element based on the container size
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('width', width).attr('height', height);

    // Add zoom behavior to the SVG element
    svg.call(
        d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
        }),
    );

    // Add a group element to the SVG element for the graph elements
    const g = svg.append('g');

    // Add the links, nodes, and labels to the graph

    // Add the links to the graph
    const link = g
        // Add a group element for the links
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(data.links)
        .enter()
        .append('line')
        // Add classes and attributes to the line elements
        .classed('stroke-zinc-500', true)
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', defaultStrokeWidth)
        // Add event listeners for mouseover and mouseout
        .on('mouseover', addHighlightEdge)
        .on('mouseout', removeHighlightEdge);

    // Add the nodes to the graph
    const node = g
        // Add a group element for the nodes
        .append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(data.nodes)
        .enter()
        .append('circle')
        // Add classes and attributes to the circle elements
        .classed('stroke-zinc-500', true)
        .attr('id', (d) => `node-${d.id}`)
        .attr('r', (d) => Math.max(10, d.degree ? d.degree * nodeRadiusCoefficient : 0))
        .attr('fill', (d) => d.color)
        // Add event listeners for drag, mouseover, mouseout, and click
        .call(
            d3
                .drag()
                .on('start', dragStartedNode)
                .on('drag', draggedNode)
                .on('end', dragEndedNode),
        )
        .on('mouseover', addHighlightOutgoingEdges)
        .on('mouseout', removeHighlightOutgoingEdges)
        .on('click', handleNodeClick);

    // Add the labels to the graph
    const label = g
        // Add a group element for the labels
        .append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(data.nodes)
        .enter()
        .append('text')
        // Add classes and attributes to the text elements
        .attr('dx', (d) => Math.max(14, d.degree * nodeRadiusCoefficient + 4))
        .attr('dy', '.35em')
        .attr('class', 'text-xs dark:fill-white')
        .text((d) => d.label);

    // Set up the D3 force simulation with the nodes and links

    const nodeCount = data.nodes.length;

    // The following values are used to set up the D3 force simulation
    // These values are based on the size of the graph
    // These values are used to determine the layout of the graph and the strength of the forces in the simulation
    // The way the values are calculated is based on experimentation and might need tweaking based on the actual data
    // I tried my best to explain the reasoning behind the values
    // This seems like a good starting point, but it will probably need tweaking to make it look good in a real-world scenario

    // Calculate the link distance and charge strength based on the number of nodes
    // linkDistance represents the desired distance between connected nodes, based on the spacing coefficient and the number of nodes
    // linkDistance is determined by multiplying the spacing coefficient and the square root of the number of nodes
    // The higher the linkDistance, the longer the links will be
    const linkDistance = spacingCoefficient * Math.sqrt(nodeCount);
    // chargeStrength represents the strength of the repulsion between nodes, based on the spacing coefficient, the number of nodes, and the component distance coefficient
    // chargeStrength is determined by multiplying the component distance coefficient, the negative spacing coefficient, and the square root of the number of nodes
    // The higher the chargeStrength, the more the nodes will repel each other, creating more space between them
    const chargeStrength =
        -1 * componentDistanceCoefficient * spacingCoefficient * Math.sqrt(nodeCount);

    // Create the D3 force simulation
    simulation.current = d3
        .forceSimulation()
        .force(
            'link',
            d3
                .forceLink()
                .id((d) => d.id)
                .distance(linkDistance),
        )
        // Add forces to the simulation
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        // Enable collision detection to prevent nodes from overlapping
        .force(
            'collision',
            d3
                .forceCollide()
                .radius((d) => Math.max(10, d.degree * nodeRadiusCoefficient + 2)),
        )
        // Add a center gravity force to pull the nodes towards the center of the SVG element
        .force('center', d3.forceCenter(width / 2, height / 2))
        // X and Y forces to keep the nodes within the bounds of the SVG element
        // When a direction for the force is not specified, the force is applied towards the center of the SVG element (coordinates 0, 0)
        // Basically this is to prevent the nodes from flying off the screen
        // It used to be that disjoint components would fly off the screen, but now they are kept in the center
        // But it might need tweaking based on the actual data
        // The center gravity is used to determine the strength of the force that pulls the nodes towards the center
        .force('x', d3.forceX().strength(centerGravity))
        .force('y', d3.forceY().strength(centerGravity))
        // Set the alpha decay and velocity decay for the simulation
        .alphaDecay(0.05)
        .velocityDecay(0.2);

    // Function to update the graph layout on each tick of the simulation
    function ticked() {
        link.attr('x1', (d) => d.source.x)
            .attr('y1', (d) => d.source.y)
            .attr('x2', (d) => d.target.x)
            .attr('y2', (d) => d.target.y);

        node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

        label.attr('x', (d) => d.x).attr('y', (d) => d.y);
    }

    // Function to handle the drag start event for nodes
    // It sets the fixed position of the node to the current position
    // It also restarts the simulation to update the graph layout
    function dragStartedNode(event, d) {
        if (!event.active) simulation.current.alphaTarget(0.05).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    // Function to handle the drag event for nodes
    // It updates the fixed position of the node based on the drag event
    function draggedNode(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    // Function to handle the drag end event for nodes
    // It clears the fixed position of the node
    // It also sets the alpha target to 0 to stop the simulation
    function dragEndedNode(event, d) {
        if (!event.active) simulation.current.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Function to add highlight to the edge and connected nodes on mouseover
    // It needs a custom css class to highlight the edge - graph-highlighted
    // Selects the edge, source node, and target node and adds the highlight class
    function addHighlightEdge(event, d) {
        d3.select(this).classed('graph-highlighted', true);
        d3.select(`#node-${d.source.id}`).classed('graph-highlighted', true);
        d3.select(`#node-${d.target.id}`).classed('graph-highlighted', true);
    }

    // Function to remove highlight from the edge and connected nodes on mouseout
    // Selects the edge, source node, and target node and removes the highlight class
    function removeHighlightEdge(event, d) {
        d3.select(this).classed('graph-highlighted', false);
        d3.select(`#node-${d.source.id}`).classed('graph-highlighted', false);
        d3.select(`#node-${d.target.id}`).classed('graph-highlighted', false);
    }

    // Function to add highlight to the outgoing edges and connected nodes on mouseover
    // Selects the node, outgoing edges, and connected nodes and adds the highlight class
    // Needs a custom css class to highlight the edges and nodes - graph-highlighted
    function addHighlightOutgoingEdges(event, d) {
        d3.selectAll('line').attr('stroke-width', defaultStrokeWidth);
        d3.selectAll('circle').attr('stroke', null).attr('stroke-width', null);

        d3.selectAll('line')
            .filter((link) => link.source.id === d.id || link.target.id === d.id)
            .classed('graph-highlighted', true)
            .each(function (link) {
                d3.select(`#node-${link.target.id}`).classed('graph-highlighted', true);
                d3.select(`#node-${link.source.id}`).classed('graph-highlighted', true);
            });
    }

    // Function to remove highlight from the outgoing edges and connected nodes on mouseout
    // Selects the all edges and nodes and removes the highlight class
    function removeHighlightOutgoingEdges(event, d) {
        d3.selectAll('line')
            .classed('graph-highlighted', false)
            .attr('stroke-width', defaultStrokeWidth);
        d3.selectAll('circle')
            .classed('graph-highlighted', false)
            .attr('stroke-width', null);
    }

    // Function to handle the node click event
    // It fixes the position of the node and sets the highlighted node
    // The highlighted node has its details handled in the parent component (GraphComponent)
    // It clears the fixed position of the node after setting the highlighted node
    function handleNodeClick(event, d) {
        d.fx = d.x;
        d.fy = d.y;
        setHighlightedNode(d);
        d.fx = null;
        d.fy = null;
    }

    // Add a resize observer to update the graph layout when the container size changes
    // Makes sure the graph is always centered and fits the container
    const resizeObserver = new ResizeObserver(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.attr('width', width).attr('height', height);
        simulation.current.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.current.alpha(1).restart();
    });
    resizeObserver.observe(container);

    // Update the simulation with the nodes and links
    simulation.current.nodes(data.nodes).on('tick', ticked);
    simulation.current.force('link').links(data.links);

    return () => {
        resizeObserver.unobserve(container);
        simulation.current.stop();
    };
};

/**
 * Visualize the graph using canvas and D3.js for force simulation with zooming and panning.
 *
 * @param {Object} data - The graph data with nodes and links.
 * @param {Object} context - The 2D rendering context from the canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {Function} setHighlightedNode - Function to handle node highlighting.
 * @param {Object} simulation - D3 force simulation reference.
 * @param {number} nodeRadiusCoefficient - Base coefficient for node size.
 * @param {number} spacingCoefficient - Coefficient for node spacing.
 * @param {number} componentDistanceCoefficient - Coefficient for component spacing.
 * @param {number} centerGravity - Gravitational force for centering the graph.
 */
export function visualizeGraphCanvas(
    data,
    context,
    canvas,
    setHighlightedNode,
    simulation,
    nodeRadiusCoefficient,
    spacingCoefficient,
    componentDistanceCoefficient,
    centerGravity,
) {
    const width = canvas.width;
    const height = canvas.height;
    let transform = d3.zoomIdentity; // Keep track of the current zoom transform
    let hoveredNode = null; // To track the currently hovered node
    let clickedNode = null; // To track the currently clicked (locked) node

    let connectedNodes = new Set();
    var maxDegree = -1;
    var minDegree = Infinity;

    // Calculate the degree (number of connected edges) for each node
    const nodeDegrees = {};
    data.nodes.forEach((node) => {
        nodeDegrees[node.id] = 0; // Initialize degree
    });
    data.links.forEach((link) => {
        if (!(link.source.id in nodeDegrees)) {
            nodeDegrees[link.source.id] = 0;
        }
        if (!(link.target.id in nodeDegrees)) {
            nodeDegrees[link.target.id] = 0;
        }
        nodeDegrees[link.source.id]++;
        nodeDegrees[link.target.id]++;

        maxDegree = Math.max(
            maxDegree,
            nodeDegrees[link.source.id],
            nodeDegrees[link.target.id],
        );
        minDegree = Math.min(
            minDegree,
            nodeDegrees[link.source.id],
            nodeDegrees[link.target.id],
        );
    });

    // Function to handle zooming and panning
    function zoomed(event) {
        transform = event.transform;
        ticked(); // Re-draw the graph with the new zoom transform
    }

    // Set up D3 zoom behavior
    d3.select(canvas).call(
        d3
            .zoom()
            .scaleExtent([0.1, 10]) // Set zoom limits
            .translateExtent([
                [-Infinity, -Infinity],
                [Infinity, Infinity],
            ]) // Allow panning beyond canvas boundaries if needed
            .on('zoom', zoomed),
    );

    const nodeCount = data.nodes.length;

    // The following values are used to set up the D3 force simulation
    // These values are based on the size of the graph
    // These values are used to determine the layout of the graph and the strength of the forces in the simulation
    // The way the values are calculated is based on experimentation and might need tweaking based on the actual data
    // I tried my best to explain the reasoning behind the values
    // This seems like a good starting point, but it will probably need tweaking to make it look good in a real-world scenario

    // Calculate the link distance and charge strength based on the number of nodes
    // linkDistance represents the desired distance between connected nodes, based on the spacing coefficient and the number of nodes
    // linkDistance is determined by multiplying the spacing coefficient and the square root of the number of nodes
    // The higher the linkDistance, the longer the links will be
    const linkDistance = (d) => spacingCoefficient;
    // chargeStrength represents the strength of the repulsion between nodes, based on the spacing coefficient, the number of nodes, and the component distance coefficient
    // chargeStrength is determined by multiplying the component distance coefficient, the negative spacing coefficient, and the square root of the number of nodes
    // The higher the chargeStrength, the more the nodes will repel each other, creating more space between them
    const chargeStrength = (d) =>
        -1 * componentDistanceCoefficient * Math.sqrt(d.degree);

    // Create a D3 force simulation
    simulation.current = d3
        .forceSimulation(data.nodes)
        .force(
            'link',
            d3
                .forceLink(data.links)
                .distance(spacingCoefficient)
                .id((d) => d.id),
        )
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        // Enable collision detection to prevent nodes from overlapping
        .force(
            'collision',
            d3
                .forceCollide()
                .radius((d) =>
                    Math.max(
                        10,
                        interpolate(
                            minDegree,
                            maxDegree,
                            DEFAULT_RADIUS,
                            DEFAULT_RADIUS * nodeRadiusCoefficient,
                            d.degree,
                        ),
                    ),
                ),
        )
        .force('center', d3.forceCenter(width / 2, height / 2).strength(centerGravity))
        .force('x', d3.forceX().strength(centerGravity / 2))
        .force('y', d3.forceY().strength(centerGravity / 2))
        .on('tick', ticked);

    // Function to draw the graph on each tick of the simulation

    function ticked() {
        // Clear the canvas before redrawing
        context.clearRect(0, 0, width, height);

        connectedNodes.clear();

        // Apply the current zoom transform
        context.save();
        context.translate(transform.x, transform.y);
        context.scale(transform.k, transform.k);

        // Draw the links (edges)
        context.strokeStyle = DEFAULT_BORDER; // Default edge color
        context.lineWidth = 1.5 / transform.k; // Regular stroke width
        data.links.forEach((link) => {
            context.beginPath();
            context.moveTo(link.source.x, link.source.y);
            context.lineTo(link.target.x, link.target.y);
            context.stroke();
        });

        // Draw the highlighted edges first (to act as a border or fill effect)
        if (hoveredNode || clickedNode) {
            context.strokeStyle = DEFAULT_SELECT; // Highlight color for the border
            context.lineWidth = 3 / transform.k; // Thicker border for highlighted edges
            data.links.forEach((link) => {
                if (connected(clickedNode, link) || connected(hoveredNode, link)) {
                    context.beginPath();
                    context.moveTo(link.source.x, link.source.y);
                    context.lineTo(link.target.x, link.target.y);
                    context.stroke();

                    connectedNodes.add(link.source.id);
                    connectedNodes.add(link.target.id);
                }
            });
        }

        // Draw the nodes (circles) and labels
        data.nodes.forEach((node) => {
            const nodeDegree = nodeDegrees[node.id];

            let radius = interpolate(
                minDegree,
                maxDegree,
                DEFAULT_RADIUS,
                DEFAULT_RADIUS * nodeRadiusCoefficient,
                nodeDegree,
            );

            // Draw the node fill
            context.beginPath();
            context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            context.fillStyle = node.color || 'blue'; // Default node color
            context.fill();

            // Draw the node border
            if (connectedNodes.has(node.id)) {
                context.lineWidth = 3 / transform.k; // Thicker stroke for highlighted node border
                context.strokeStyle = DEFAULT_SELECT; // Highlight color for the border
            } else {
                context.lineWidth = 1.5 / transform.k; // Regular stroke width
                context.strokeStyle = DEFAULT_BORDER; // Default border color
            }
            context.stroke();
        });

        context.restore(); // Restore context to avoid applying transformations to other drawings
    }

    // Add event listeners for interactions (hover, click)
    canvas.addEventListener('mousemove', (event) => {
        const [x, y] = d3.pointer(event, canvas);
        const transformedX = (x - transform.x) / transform.k;
        const transformedY = (y - transform.y) / transform.k;

        const foundNode = data.nodes.find(
            (node) =>
                Math.hypot(node.x - transformedX, node.y - transformedY) <
                nodeRadiusCoefficient * 5,
        );

        if (foundNode) {
            hoveredNode = foundNode; // Set the hovered node
            setHighlightedNode(clickedNode || foundNode); // Highlight the node in the UI
        } else {
            setHighlightedNode(clickedNode);
            hoveredNode = null;
        }

        ticked(); // Re-draw the graph to apply highlights
    });

    canvas.addEventListener('click', (event) => {
        const [x, y] = d3.pointer(event, canvas);
        const transformedX = (x - transform.x) / transform.k;
        const transformedY = (y - transform.y) / transform.k;

        const foundNode = data.nodes.find(
            (node) =>
                Math.hypot(node.x - transformedX, node.y - transformedY) <
                nodeRadiusCoefficient * 5,
        );

        if (foundNode) {
            clickedNode = foundNode; // Lock in the clicked node
            setHighlightedNode(foundNode); // Highlight the node in the UI
        } else {
            clickedNode = null;
            setHighlightedNode(null);
        }

        ticked(); // Re-draw the graph to apply highlights
    });
}
