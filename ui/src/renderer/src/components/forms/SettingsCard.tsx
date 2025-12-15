/**
 * SettingsCard - Card wrapper for settings form fields
 * Provides the consistent card styling used in AccountSettings
 */

import { ReactNode } from 'react';

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
        <div
            className={`rounded-lg cradle-border bg-white/[0.02] px-4 py-1 space-y-0 ${className}`}
        >
            {children}
        </div>
    );
}
