/**
 * SettingsSeparator - Horizontal divider between settings fields
 */

interface SettingsSeparatorProps {
    minimal?: boolean;
}

/**
 * Separator component that provides visual division between settings fields.
 * Uses the cradle-separator class from the design system.
 *
 * @example
 * ```tsx
 * <SettingsCard>
 *   <SettingsField label="Username">...</SettingsField>
 *   <SettingsSeparator />
 *   <SettingsField label="Email">...</SettingsField>
 * </SettingsCard>
 * ```
 */
export default function SettingsSeparator({
    minimal = false,
}): JSX.Element {
    return <div className={`cradle-separator-${minimal ? 'minimal' : ''} opacity-40`} aria-hidden='true'></div>;
}
