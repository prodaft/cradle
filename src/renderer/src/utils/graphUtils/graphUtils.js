import * as d3 from 'd3';

/**
 * entityColors - This object contains the colors for the different entity types in the graph.
 * The colors are used to distinguish between different types of entities in the graph.
 * The keys are the entity types, and the values are the corresponding hex color codes.
 *
 * @type {{actor: string, case: string, entry: string}}
 */
export const entityColors = {
    actor: '#155e75',
    case: '#7e22ce',
    entry: '#ea580c',
};

/**
 * preprocessData - This function is used to preprocess the raw data into a format suitable for the D3 force simulation.
 * The function is used in the GraphComponent component to preprocess the data before rendering the graph.
 * The function maps over the entities in the data and creates a new node for each entity with the necessary properties.
 * The function also calculates the degree of each node (i.e., the number of links connected to the node).

 * @param {
 *     {
 *          entities:[{id:string,name:string,type:string,subtype:string|undefined}],
 *          links:[{source:string,target:string}]
 *     }
 *     } data - The raw data to be preprocessed. The data should have a 'entities' property and a 'links' property.
 * @returns {
 *      {
 *          nodes: [{id:string,label:string,color:string,name:string,type:string,subtype:string|undefined,
 *          degree:number,x:number,y:number,vx:number,vy:number,fx:number|null,fy:number|null}],
 *          links: [{source:string,target:string}]
 *      }
 *      } The preprocessed data, containing an array of nodes and an array of links.
 */
export const preprocessData = (data) => {
    // Initialize an empty array for the nodes
    let nodes = [];
    // Get the links from the data
    let links = data.links;

    // Map over the entities in the data and create a new node for each entity
    nodes = data.entities.map((entity) => ({
        id: entity.id,
        label: entity.subtype ? `${entity.subtype}: ${entity.name}` : entity.name,
        color: entityColors[entity.type],
        name: entity.name,
        type: entity.type,
        subtype: entity.subtype,
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

/**
 * visualizeGraph - This function is used to visualize the graph data using D3.js.
 * The function is used in the GraphComponent component to render the graph in the SVG element.
 * The function sets up the SVG element, adds the links, nodes, and labels to the graph, and creates the D3 force simulation.
 * The function also adds zoom behavior to the SVG element and sets up the resize observer to update the graph layout.
 * The function returns a cleanup function to stop the simulation and remove the resize observer when the component is unmounted.
 *
 * @param {
 *      {
 *          nodes: [{id:string,label:string,color:string,name:string,type:string,subtype:string|undefined,
 *          degree:number,x:number,y:number,vx:number,vy:number,fx:number|null,fy:number|null}],
 *          links: [{source:string,target:string}]
 *      }
 *      } data - The preprocessed data to be visualized. The data should have a 'nodes' property and a 'links' property.
 * @param {React.Ref} svgRef - The ref to the SVG element where the graph will be rendered.
 * @param {(
 *          {id:string,label:string,color:string,name:string,type:string,subtype:string|undefined,
 *          degree:number,x:number,y:number,vx:number,vy:number,fx:number|null,fy:number|null}
 *          ) => void} setHighlightedNode - The function to set the highlighted node when a node is clicked.
 * @param {d3-force.simulation} simulation - The ref to the D3 force simulation used to update the graph layout.
 * @param {number} nodeRadiusCoefficient - The coefficient used to calculate the radius of the nodes based on the degree of the node.
 * @param {number} spacingCoefficient - The coefficient used to calculate the desired distance between connected nodes.
 * @param {number} componentDistanceCoefficient - The coefficient used to calculate the strength of the repulsion between nodes.
 * @param {number} centerGravity - The strength of the force that pulls the nodes towards the center.
 * @returns {() => void} - The cleanup function to stop the simulation and remove the resize observer when the component is unmounted.
 */
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
        .attr('dx', (d) => Math.max(10, d.degree * nodeRadiusCoefficient + 2))
        .attr('dy', '.35em')
        .attr('class', 'text-xs fill-current dark:fill-white')
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
