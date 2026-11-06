import * as React from 'react';

import { Checkbox as CheckboxBase } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// shadcn's Checkbox only styles the checked state. For `indeterminate` (e.g. select-all
// with a partial selection) fill it like checked and swap the check glyph for a dash;
// `after:` is taken by the base hit-area, so the dash is drawn with `before:`.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxBase>) {
    return (
        <CheckboxBase
            className={cn(
                'data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary data-indeterminate:before:h-0.5 data-indeterminate:before:w-2 data-indeterminate:before:bg-current data-indeterminate:[&_svg]:hidden',
                className,
            )}
            {...props}
        />
    );
}

export { Checkbox };
