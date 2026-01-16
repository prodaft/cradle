import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import * as React from 'react';

interface RouterSheetProps {
    children: React.ReactNode;
    trigger: React.ReactNode;
    title: string;
    description?: string;
    onOpenChange?: (open: boolean) => void;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * RouterSheet - A router-compatible Sheet component
 * Fixes animation issues with TanStack Router by using controlled state
 */
export function RouterSheet({
    children,
    trigger,
    title,
    description,
    onOpenChange,
    side = 'right',
}: RouterSheetProps) {
    const [open, setOpen] = React.useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side={side}>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>
                <div className='mt-4'>{children}</div>
            </SheetContent>
        </Sheet>
    );
}
