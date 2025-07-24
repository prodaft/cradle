import React, { useRef, useEffect, forwardRef } from 'react';
import cytoscape from 'cytoscape';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';

const Graph = forwardRef(function (
    { onLinkClick, onNodesSelected, config, entryGraphColors, ...props },
    cyRef,
) {
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const cy = cytoscape({
            container: containerRef.current,
            wheelSensitivity: 0.2,
            renderer: {
                name: 'canvas',
                // webgl: true, // turns on WebGL mode
            },
            boxSelectionEnabled: true, // Enable box selection for multiple nodes
        });

        cyRef.current = cy;

        // Handle edge selection
        cy.on('tap', 'edge', (e) => {
            const edge = e.target;
            const source = edge.source();
            const target = edge.target();

            cy.nodes().removeClass('highlighted');

            source.addClass('highlighted');
            target.addClass('highlighted');

            const edgeData = {
                id: edge.id(),
                source: {
                    id: source.id(),
                    label: source.data('label'),
                },
                target: {
                    id: target.id(),
                    label: target.data('label'),
                },
            };

            onLinkClick(edgeData);
        });

        // Handle node selection
        cy.on('tap', 'node', () => {
            cy.nodes().removeClass('highlighted');
        });

        // Handle multiple node selection
        cy.on('select unselect', 'node', () => {
            const selectedNodes = cy.nodes(':selected');
            if (onNodesSelected) {
                const nodeData = selectedNodes.map((node) => ({
                    id: node.id(),
                }));
                onNodesSelected(nodeData);
            }
        });

        // Clear selection when clicking on the background
        cy.on('tap', (e) => {
            if (e.target === cy) {
                cy.elements().unselect();
                cy.nodes().removeClass('highlighted');
            }
        });

        return () => {
            cy.destroy();
        };
    }, [navigate, cyRef, containerRef]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100vh',
                backgroundColor: isDarkMode ? '#151515' : '#f9f9f9',
            }}
        />
    );
});

export default Graph;
