import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MouseEvent, ReactNode } from 'react';

interface TableActionsButtonProps {
    /** Menu items to display in the dropdown */
    children: ReactNode;
    /** Optional className for the button */
    className?: string;
    /** Optional onClick handler for the button */
    onClick?: (e: MouseEvent) => void;
    /** Whether to stop propagation on click */
    stopPropagation?: boolean;
}

/**
 * Reusable table row actions button with dropdown menu
 *
 * @example
 * ```tsx
 * <TableActionsButton>
 *   <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
 *   <DropdownMenuItem onClick={handleDelete} variant="destructive">Delete</DropdownMenuItem>
 * </TableActionsButton>
 * ```
 */
export default function TableActionsButton({
    children,
    className = '',
    onClick,
    stopPropagation = true,
}: TableActionsButtonProps) {
    const handleButtonClick = (e: MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
        onClick?.(e);
    };

    return (
        <div
            className={className}
            onClick={(e) => stopPropagation && e.stopPropagation()}
        >
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        onClick={handleButtonClick}
                    >
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='h-4 w-4'
                        >
                            <circle cx='12' cy='12' r='1'></circle>
                            <circle cx='19' cy='12' r='1'></circle>
                            <circle cx='5' cy='12' r='1'></circle>
                        </svg>
                        <span className='sr-only'>Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                    {children}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
