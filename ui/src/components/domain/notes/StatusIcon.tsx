import { CheckCircleIcon, CircleIcon, FeatherIcon, InfoIcon, TimerIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';

export type StatusType =
    | 'healthy'
    | 'processing'
    | 'warning'
    | 'invalid'
    | 'done'
    | 'working'
    | 'error'
    | 'waiting'
    | 'info'
    | 'fleeting'
    | 'all';

interface StatusIconProps {
    status: StatusType;
    size?: number;
    className?: string;
}

/**
 * Unified status icon component with consistent colors for all status types across the application
 */
export function StatusIcon({ status, size = 18, className }: StatusIconProps) {
    switch (status) {
        case 'healthy':
        case 'done':
            return (
                <CheckCircleIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-primary'}
                />
            );
        case 'processing':
        case 'working':
            return (
                <TimerIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-primary'}
                />
            );
        case 'info':
            return (
                <InfoIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-primary'}
                />
            );
        case 'warning':
        case 'waiting':
            return (
                <WarningIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-muted-foreground'}
                />
            );
        case 'invalid':
        case 'error':
            return (
                <WarningCircleIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-destructive'}
                />
            );
        case 'fleeting':
            return (
                <FeatherIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-primary'}
                />
            );
        case 'all':
            return (
                <CircleIcon
                    size={size}
                    weight="fill"
                    className={className || 'text-primary'}
                />
            );
        default:
            return null;
    }
}
