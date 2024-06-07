import {useEffect, useState} from "react";

export function useChangeFlexDirectionBySize(containerRef) {
    const [flexDirection, setFlexDirection] = useState('flex-col');
    useEffect(() => {
        const containerElement = containerRef.current;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setFlexDirection(entry.contentRect.width > 500 ? 'flex-row' : 'flex-col');
            }
        });

        resizeObserver.observe(containerElement);

        return () => {
            if (containerElement) {
                resizeObserver.unobserve(containerElement);
            }
        };
    }, [containerRef]);

    return flexDirection;
}