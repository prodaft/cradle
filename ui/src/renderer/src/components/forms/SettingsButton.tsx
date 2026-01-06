/**
 * SettingsButton - Action button component for settings pages
 * Matches the AccountSettings design pattern with label/description on left, button on right
 */

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
}: SettingsButtonProps): JSX.Element {
    const variantClasses = {
        default:
            'rounded-lg border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary',
        danger: 'rounded-lg border border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 bg-transparent transition-colors',
    };

    return (
        <div className='flex items-center justify-between py-2'>
            <div>
                <span className='text-sm cradle-text-tertiary block mb-0.5'>
                    {label}
                </span>
                {description && (
                    <span className='text-sm cradle-text-muted'>{description}</span>
                )}
            </div>
            <button
                type='button'
                className={`${variantClasses[variant]} text-sm px-3 py-1.5 flex items-center gap-1.5 ${className || ''}`}
                {...props}
            >
                {icon}
                <span>{loading ? 'Loading...' : buttonText}</span>
            </button>
        </div>
    );
}
