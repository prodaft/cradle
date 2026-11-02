/**
 * OfflineIndicator - Shows when queries are paused due to offline state
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
    message?: string;
    className?: string;
}

export default function OfflineIndicator({
    message = 'You are currently offline. Data will load when connection is restored.',
    className = '',
}: OfflineIndicatorProps) {
    return (
        <Alert variant='default' className={className}>
            <WifiOff />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
