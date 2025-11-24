import { createContext, useContext, useMemo, useRef, useCallback, ReactNode } from 'react';

interface TabHostContextValue {
    ensureContainer: (tabId: string) => HTMLDivElement;
    attach: (tabId: string, mountPoint: HTMLElement | null) => void;
    destroy: (tabId: string) => void;
}

const TabHostContext = createContext<TabHostContextValue | null>(null);

export const useTabHost = (): TabHostContextValue => {
    const v = useContext(TabHostContext);
    if (!v) throw new Error('useTabHost must be used within TabHostProvider');
    return v;
};

interface TabHostProviderProps {
    children: ReactNode;
}

export function TabHostProvider({ children }: TabHostProviderProps) {
    // Map<tabId, HTMLDivElement>
    const containersRef = useRef<Map<string, HTMLDivElement>>(new Map());

    const ensureContainer = useCallback((tabId: string): HTMLDivElement => {
        let el = containersRef.current.get(tabId);
        if (!el) {
            console.log('[TabHost] Creating new container for tab:', tabId);
            el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            // Use full viewport size for parking to ensure correct layout calculations
            el.style.width = '100vw';
            el.style.height = '100vh';
            el.style.pointerEvents = 'none';
            el.style.zIndex = '1';
            el.style.visibility = 'hidden';
            el.style.overflow = 'hidden';
            containersRef.current.set(tabId, el);
            // Park it under body by default; panes will reparent it.
            document.body.appendChild(el);
        }
        // Don't log reuse - too noisy
        return el;
    }, []);

    const attach = useCallback(
        (tabId: string, mountPoint: HTMLElement | null) => {
            const el = ensureContainer(tabId);
            if (mountPoint && el.parentNode !== mountPoint) {
                console.log(
                    '[TabHost] Reparenting tab:',
                    tabId,
                    'from',
                    el.parentNode?.nodeName,
                    'to',
                    mountPoint.nodeName
                );
                // Inherit pointer-events from mount point
                const mountPointStyle = window.getComputedStyle(mountPoint);
                el.style.pointerEvents = mountPointStyle.pointerEvents;
                el.style.visibility = 'visible';
                el.style.width = '100%';
                el.style.height = '100%';
                el.style.right = '0';
                el.style.bottom = '0';
                el.style.overflow = 'visible';
                mountPoint.appendChild(el); // DOM reparent (no React remount)
            } else {
                console.log('[TabHost] Tab:', tabId, 'already attached to correct mount point');
            }
        },
        [ensureContainer]
    );

    const destroy = useCallback((tabId: string) => {
        const el = containersRef.current.get(tabId);
        if (!el) return;
        if (el.parentNode) el.parentNode.removeChild(el);
        // Reset to minimal state, but keep full size for layout safety
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.overflow = 'hidden';
        containersRef.current.delete(tabId);
    }, []);

    const value = useMemo<TabHostContextValue>(
        () => ({ ensureContainer, attach, destroy }),
        [ensureContainer, attach, destroy]
    );

    return <TabHostContext.Provider value={value}>{children}</TabHostContext.Provider>;
}
