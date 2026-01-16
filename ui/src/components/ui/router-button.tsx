import { Button, type ButtonProps } from '@/components/ui/button';
import { createLink } from '@tanstack/react-router';
import { forwardRef } from 'react';

/**
 * RouterButton - A router-compatible Button component
 * Provides full type safety with TanStack Router navigation
 */
export const RouterButton = createLink(
    forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
        return <Button ref={ref} {...props} />;
    }),
);
