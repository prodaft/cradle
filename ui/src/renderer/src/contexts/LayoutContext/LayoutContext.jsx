import { createContext, useCallback, useContext, useState } from 'react';

const LayoutContext = createContext();

/**
 * Custom hook to access the LayoutContext
 * @returns {Object} The layout context value
 */
export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

/**
 * Generates a unique ID for a pane
 * @returns {string} A unique pane ID
 */
const generatePaneId = () => {
    return `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * LayoutProvider component that manages the layout of panes
 * Each pane has its own set of tabs and content
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const LayoutProvider = ({ children }) => {
    // Layout structure: array of panes with their configuration
    // Each pane can be a leaf (with tabs) or a container (with children panes)
    const [layout, setLayout] = useState({
        type: 'pane', // or 'split-horizontal' or 'split-vertical'
        id: generatePaneId(),
    });
    
    const [activePaneId, setActivePaneId] = useState(layout.id);

    /**
     * Splits a pane horizontally or vertically
     * @param {string} paneId - The ID of the pane to split
     * @param {string} direction - 'horizontal' or 'vertical'
     * @param {string} position - 'before' or 'after' - where to place the new pane
     * @returns {Object} Object with originalPaneId (keeps content) and newPaneId (empty)
     */
    const splitPane = useCallback((paneId, direction, position = 'after') => {
        const originalPaneId = generatePaneId();
        const newPaneId = generatePaneId();
        
        setLayout(currentLayout => {
            const split = (node) => {
                if (node.id === paneId) {
                    // Convert this pane into a split container
                    const originalPane = { ...node, id: originalPaneId };
                    const newPane = { type: 'pane', id: newPaneId };
                    
                    return {
                        type: direction === 'horizontal' ? 'split-horizontal' : 'split-vertical',
                        id: node.id,
                        children: position === 'before' 
                            ? [newPane, originalPane]  // New pane first (top/left)
                            : [originalPane, newPane], // New pane second (bottom/right)
                        sizes: [50, 50], // Equal split
                    };
                }
                
                if (node.children) {
                    return {
                        ...node,
                        children: node.children.map(child => split(child)),
                    };
                }
                
                return node;
            };
            
            return split(currentLayout);
        });
        
        return { originalPaneId, newPaneId };
    }, []);

    /**
     * Closes a pane
     * @param {string} paneId - The ID of the pane to close
     */
    const closePane = useCallback((paneId) => {
        let nextActivePaneId = null;
        
        setLayout(currentLayout => {
            // Don't close if it's the only pane
            if (currentLayout.id === paneId && currentLayout.type === 'pane') {
                return currentLayout;
            }

            const remove = (node, parent = null, indexInParent = -1) => {
                // If this is a split container
                if (node.children) {
                    const newChildren = [];
                    
                    for (let i = 0; i < node.children.length; i++) {
                        const child = node.children[i];
                        
                        if (child.id === paneId) {
                            // Skip this child (remove it)
                            continue;
                        }
                        
                        // Recursively process child
                        const processed = remove(child, node, i);
                        if (processed) {
                            newChildren.push(processed);
                        }
                    }
                    
                    // If only one child remains, collapse the split
                    if (newChildren.length === 1) {
                        return newChildren[0];
                    }
                    
                    // If no children remain, remove this node
                    if (newChildren.length === 0) {
                        return null;
                    }
                    
                    return {
                        ...node,
                        children: newChildren,
                    };
                }
                
                // If this is the pane to remove
                if (node.id === paneId) {
                    return null;
                }
                
                return node;
            };
            
            const newLayout = remove(currentLayout);
            const finalLayout = newLayout || { type: 'pane', id: generatePaneId() };
            
            // If closing the active pane, find the next pane in the NEW layout
            if (paneId === activePaneId) {
                const findFirstPane = (node) => {
                    if (!node) return null;
                    if (node.type === 'pane' && node.id !== paneId) {
                        return node.id;
                    }
                    if (node.children) {
                        for (const child of node.children) {
                            const found = findFirstPane(child);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                nextActivePaneId = findFirstPane(finalLayout);
            }
            
            return finalLayout;
        });
        
        // Update active pane after state has settled
        if (nextActivePaneId) {
            requestAnimationFrame(() => setActivePaneId(nextActivePaneId));
        }
    }, [activePaneId]);

    /**
     * Updates the sizes of panes in a split container
     * @param {string} containerId - The ID of the split container
     * @param {number[]} newSizes - The new sizes (percentages)
     */
    const updatePaneSizes = useCallback((containerId, newSizes) => {
        setLayout(currentLayout => {
            const update = (node) => {
                if (node.id === containerId) {
                    return {
                        ...node,
                        sizes: newSizes,
                    };
                }
                
                if (node.children) {
                    return {
                        ...node,
                        children: node.children.map(child => update(child)),
                    };
                }
                
                return node;
            };
            
            return update(currentLayout);
        });
    }, []);

    /**
     * Gets all pane IDs in the layout
     * @returns {string[]} Array of pane IDs
     */
    const getAllPaneIds = useCallback(() => {
        const paneIds = [];
        
        const traverse = (node) => {
            if (!node) return;
            if (node.type === 'pane') {
                paneIds.push(node.id);
            }
            if (node.children) {
                node.children.forEach(child => traverse(child));
            }
        };
        
        traverse(layout);
        return paneIds;
    }, [layout]);

    const value = {
        layout,
        activePaneId,
        setActivePaneId,
        splitPane,
        closePane,
        updatePaneSizes,
        getAllPaneIds,
    };

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

