import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import * as React from 'react';

interface RouterDialogProps {
    children: React.ReactNode;
    trigger: React.ReactNode;
    title: string;
    description?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

/**
 * RouterDialog - A router-compatible Dialog component
 * Fixes animation issues with TanStack Router by using controlled state
 */
export function RouterDialog({
    children,
    trigger,
    title,
    description,
    open: controlledOpen,
    onOpenChange,
}: RouterDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);

    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? (
                        <DialogDescription>{description}</DialogDescription>
                    ) : (
                        <DialogDescription className='sr-only'>
                            Dialog content
                        </DialogDescription>
                    )}
                </DialogHeader>
                <div className='mt-4'>{children}</div>
            </DialogContent>
        </Dialog>
    );
}
