import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as React from 'react';

import { AlertDialogAction as AlertDialogActionBase } from '@/components/ui/alert-dialog';

// shadcn's AlertDialogAction is a plain Button. Render it through a Close part (like
// Radix's AlertDialog.Action) so confirming dismisses the dialog; callers rely on that.
function AlertDialogAction({
    variant,
    size,
    ...props
}: AlertDialogPrimitive.Close.Props &
    Pick<React.ComponentProps<typeof AlertDialogActionBase>, 'variant' | 'size'>) {
    return (
        <AlertDialogPrimitive.Close
            render={<AlertDialogActionBase variant={variant} size={size} />}
            {...props}
        />
    );
}

export { AlertDialogAction };
