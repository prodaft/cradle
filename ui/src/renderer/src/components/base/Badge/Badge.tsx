import React from 'react';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';
export type BadgeShape = 'rounded' | 'pill';

export interface BadgeProps {
    /** The content to display inside the badge */
    children: React.ReactNode;
    /** The color variant of the badge */
    variant?: BadgeVariant;
    /** Custom background color (overrides variant) */
    color?: string;
    /** Shape of the badge */
    shape?: BadgeShape;
    /** Additional CSS classes */
    className?: string;
    /** Optional title attribute for tooltip */
    title?: string;
}

/**
 * Badge component for displaying status indicators, tags, and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success">Done</Badge>
 * <Badge variant="error" shape="pill">Error</Badge>
 * <Badge color="#FF5733">Custom</Badge>
 * ```
 */
export default function Badge({
    children,
    variant = 'default',
    color,
    shape = 'rounded',
    className = '',
    title,
}: BadgeProps): JSX.Element {
    // Base classes for all badges
    const baseClasses =
        'inline-flex items-center px-2 py-0.5 text-xs font-medium text-white shadow-sm';

    // Shape classes
    const shapeClasses = shape === 'pill' ? 'rounded-full' : 'rounded';

    // Variant color classes
    const getVariantColor = (): string => {
        // If custom color is provided, don't use variant colors
        if (color) return '';

        switch (variant) {
            case 'success':
                return 'bg-green-600';
            case 'error':
                return 'bg-red-600';
            case 'warning':
                return 'bg-yellow-600';
            case 'info':
                return 'bg-blue-600';
            case 'default':
            default:
                return 'bg-zinc-500';
        }
    };

    const variantColor = getVariantColor();

    // Combine all classes
    const combinedClasses = `${baseClasses} ${shapeClasses} ${variantColor} ${className}`.trim();

    // Apply custom color via inline style if provided
    const style = color ? { backgroundColor: color } : undefined;

    return (
        <span className={combinedClasses} style={style} title={title}>
            {children}
        </span>
    );
}
