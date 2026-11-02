import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Badge as BadgeBase } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Adds a compact size to shadcn's Badge, whose single built-in size is h-5.
const badgeSizeVariants = cva('', {
    variants: {
        size: {
            default: '',
            sm: 'h-4 px-1.5 py-0 text-[10px] leading-none',
        },
    },
});

function Badge({
    className,
    size,
    ...props
}: React.ComponentProps<typeof BadgeBase> & VariantProps<typeof badgeSizeVariants>) {
    return (
        <BadgeBase className={cn(badgeSizeVariants({ size }), className)} {...props} />
    );
}

export { Badge };
