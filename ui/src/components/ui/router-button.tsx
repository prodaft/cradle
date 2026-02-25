import { Button } from '@/components/ui/button';
import { createLink } from '@tanstack/react-router';
import type React from 'react';

/**
 * RouterButton - A router-compatible Button component
 * Provides full type safety with TanStack Router navigation
 */
export const RouterButton = createLink(
    (props: React.ComponentProps<typeof Button>) => {
        return <Button {...props} />;
    },
);
