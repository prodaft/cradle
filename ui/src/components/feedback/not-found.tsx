import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

interface NotFoundProps {
    message?: string;
}

/**
 * NotFound component - a placeholder component for pages that are not found.
 */
export default function NotFound({ message }: NotFoundProps) {
    useDockPanelTab({ title: 'Not found', icon: 'not-found' });
    return (
        <Empty className='h-full'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <MagnifyingGlassIcon />
                </EmptyMedia>
                <EmptyTitle>404 - Not Found</EmptyTitle>
                <EmptyDescription>
                    {message || "The page you're looking for doesn't exist."}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
