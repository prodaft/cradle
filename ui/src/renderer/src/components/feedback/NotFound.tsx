import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';

interface NotFoundProps {
    message?: string;
}

/**
 * NotFound component - a placeholder component for pages that are not found.
 */
export default function NotFound({ message }: NotFoundProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>404 - Not Found</EmptyTitle>
                <EmptyDescription>
                    {message ||
                        "The page you're looking for doesn't exist. Try searching for what you need below."}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
