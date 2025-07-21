import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Custom Tooltip component that uses React Portal
const Tooltip = ({ children, content, position = 'top', className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const targetRef = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        if (isVisible && targetRef.current && tooltipRef.current) {
            const targetRect = targetRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = targetRect.top - tooltipRect.height - 8;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = targetRect.bottom + 8;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.left - tooltipRect.width - 8;
                    break;
                case 'right':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.right + 8;
                    break;
            }

            // Keep tooltip within viewport
            if (top < 0) top = 8;
            if (left < 0) left = 8;
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 8;
            }

            setCoords({ top, left });
        }
    }, [isVisible, position]);

    const tooltipElement =
        isVisible &&
        createPortal(
            <div
                ref={tooltipRef}
                className='fixed z-[99999] px-3 py-2 text-sm text-white bg-primary rounded-lg shadow-lg pointer-events-none transition-opacity duration-200'
                style={{
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    opacity: coords.top ? 1 : 0,
                }}
            >
                {content}
                {/* Arrow */}
                <div
                    className={`absolute w-0 h-0 border-4 border-transparent ${
                        position === 'top'
                            ? 'border-t-primary -bottom-2 left-1/2 -translate-x-1/2'
                            : position === 'bottom'
                              ? 'border-b-primary -top-2 left-1/2 -translate-x-1/2'
                              : position === 'left'
                                ? 'border-l-primary -right-2 top-1/2 -translate-y-1/2'
                                : 'border-r-primary -left-2 top-1/2 -translate-y-1/2'
                    }`}
                />
            </div>,
            document.body,
        );

    return (
        <>
            <span
                ref={targetRef}
                className={className}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
            >
                {children}
            </span>
            {tooltipElement}
        </>
    );
};

export default Tooltip;
