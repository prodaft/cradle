/**
 * SettingsButton - Action button component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, button on right
 */

import { Button } from '@/components/ui/button';
import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface SettingsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Label text for the button row */
    label: string;
    /** Description text displayed below the label */
    description?: string;
    /** Button text */
    buttonText: string;
    /** Icon to display in the button */
    icon?: ReactNode;
    /** Button variant ('default', 'danger') */
    variant?: 'default' | 'danger';
    /** Whether the button is loading */
    loading?: boolean;
}

/**
 * Action button component with horizontal layout for settings pages.
 * Used for actions like "Change Password", "Generate API Key", etc.
 *
 * @example
 * ```tsx
 * import { Lock } from 'iconoir-react';
 *
 * <SettingsCard>
 *   <SettingsButton
 *     label="Password"
 *     description="Change your account password"
 *     buttonText="Change"
 *     icon={<Lock className='w-3.5 h-3.5' />}
 *     onClick={openChangePasswordModal}
 *   />
 * </SettingsCard>
 * ```
 */
export default function SettingsButton({
    label,
    description,
    buttonText,
    icon,
    variant = 'default',
    loading = false,
    className,
    ...props
}: SettingsButtonProps): React.ReactElement {
    return (
        <div className='flex items-center justify-between py-2'>
            <div>
                <span className='text-sm text-muted-foreground block mb-0.5'>
                    {label}
                </span>
                {description && (
                    <span className='text-sm text-muted-foreground'>{description}</span>
                )}
            </div>
            <Button
                type='button'
                variant={variant === 'danger' ? 'destructive' : 'outline'}
                size='sm'
                className={className}
                {...props}
            >
                {icon}
                {loading ? 'Loading...' : buttonText}
            </Button>
        </div>
    );
}
