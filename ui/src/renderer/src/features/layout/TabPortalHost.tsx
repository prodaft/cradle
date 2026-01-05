/**
 * Tab Portal Host - Manages DOM containers for tab content portals
 * 
 * This enables tabs to persist their state when switching between them,
 * by using DOM reparenting instead of React remounting.
 */

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useRef,
} from 'react';
import { TabId } from './types';

// ============================================================================
// Context Types
// ============================================================================

interface TabPortalHostContextValue {
    /**
     * Get or create a DOM container for a tab
     */
    getContainer: (tabId: TabId) => HTMLDivElement;
    
    /**
     * Attach a tab's container to a mount point (reparents in DOM)
     */
    attach: (tabId: TabId, mountPoint: HTMLElement) => void;
    
    /**
     * Detach and clean up a tab's container
     */
    destroy: (tabId: TabId) => void;
}

// ============================================================================
// Context
// ============================================================================

const TabPortalHostContext = createContext<TabPortalHostContextValue | null>(null);

export function useTabPortalHost(): TabPortalHostContextValue {
    const ctx = useContext(TabPortalHostContext);
    if (!ctx) {
        throw new Error('useTabPortalHost must be used within a TabPortalHostProvider');
    }
    return ctx;
}

// ============================================================================
// Provider
// ============================================================================

interface TabPortalHostProviderProps {
    children: ReactNode;
}

export function TabPortalHostProvider({ children }: TabPortalHostProviderProps) {
    // Store containers by tab ID
    const containersRef = useRef<Map<TabId, HTMLDivElement>>(new Map());
    
    /**
     * Get or create a container for a tab
     */
    const getContainer = useCallback((tabId: TabId): HTMLDivElement => {
        let container = containersRef.current.get(tabId);
        
        if (!container) {
            container = document.createElement('div');
            container.setAttribute('data-tab-id', tabId);
            
            // Initial styles for parking (hidden, out of view)
            Object.assign(container.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                visibility: 'hidden',
                pointerEvents: 'none',
                overflow: 'hidden',
            });
            
            containersRef.current.set(tabId, container);
            
            // Park under body initially
            document.body.appendChild(container);
        }
        
        return container;
    }, []);
    
    /**
     * Attach a tab container to a mount point
     */
    const attach = useCallback((tabId: TabId, mountPoint: HTMLElement) => {
        const container = getContainer(tabId);
        
        // Skip if already attached to this mount point
        if (container.parentNode === mountPoint) {
            return;
        }
        
        // Update styles for visible state
        Object.assign(container.style, {
            visibility: 'visible',
            pointerEvents: 'auto',
            overflow: 'visible',
        });
        
        // Reparent to mount point (DOM operation, no React remount)
        mountPoint.appendChild(container);
    }, [getContainer]);
    
    /**
     * Destroy a tab's container
     */
    const destroy = useCallback((tabId: TabId) => {
        const container = containersRef.current.get(tabId);
        if (!container) return;
        
        // Remove from DOM
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        // Remove from map
        containersRef.current.delete(tabId);
    }, []);
    
    // ========================================================================
    // Context Value
    // ========================================================================
    
    const value = useMemo<TabPortalHostContextValue>(() => ({
        getContainer,
        attach,
        destroy,
    }), [getContainer, attach, destroy]);
    
    return (
        <TabPortalHostContext.Provider value={value}>
            {children}
        </TabPortalHostContext.Provider>
    );
}

