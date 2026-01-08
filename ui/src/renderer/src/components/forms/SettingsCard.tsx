/**
 * SettingsCard - Card wrapper for settings form fields
 * Provides the consistent card styling used in AccountSettings
 */

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface SettingsCardProps {
    /** Card content */
    children: ReactNode;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Card wrapper component that provides consistent styling for settings pages.
 * Uses the AccountSettings card design pattern.
 *
 * @example
 * ```tsx
 * <SettingsCard>
 *   <SettingsField label="Username" description="Your display name">
 *     <input type="text" {...register('username')} />
 *   </SettingsField>
 * </SettingsCard>
 * ```
 */
export default function SettingsCard({
    children,
    className = '',
}: SettingsCardProps): JSX.Element {
    return (
        <Card className={`rounded-lg border-border bg-muted/5 space-y-0 ${className}`}>
            <CardContent className='px-4 py-1'>
                {children}
            </CardContent>
        </Card>
    );
}
