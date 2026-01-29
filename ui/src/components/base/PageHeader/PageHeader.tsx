import { ReactNode } from 'react';

interface PageHeaderProps {
    /** Page title */
    title: string;
    /** Optional page description */
    description?: string;
    /** Optional action buttons to display on the right side */
    actions?: ReactNode;
    /** Optional className for the container */
    className?: string;
}

/**
 * Reusable page header component with title, description, and action buttons
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="All Notes"
 *   description="Search & Manage Your Notes"
 *   actions={
 *     <Button>
 *       <Plus />
 *       New Note
 *     </Button>
 *   }
 * />
 * ```
 */
export default function PageHeader({
    title,
    description,
    actions,
    className = '',
}: PageHeaderProps) {
    return (
        <div
            className={`flex flex-wrap items-end justify-between gap-2 px-4 pt-4 ${className}`}
        >
            <div className='space-y-1'>
                <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
                {description && <p className='text-muted-foreground'>{description}</p>}
            </div>
            {actions && <div className='flex gap-2'>{actions}</div>}
        </div>
    );
}
