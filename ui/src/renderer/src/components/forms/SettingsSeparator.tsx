/**
 * SettingsSeparator - Horizontal divider between settings fields
 */

interface SettingsSeparatorProps {
    minimal?: boolean;
}

/**
 * Separator component that provides visual division between settings fields.
 * Uses the cradle-separator classes from the design system.
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
}: SettingsSeparatorProps): JSX.Element {
    const baseClass = minimal ? 'cradle-separator-minimal' : 'cradle-separator';
    return <div className={`${baseClass} opacity-40`} aria-hidden='true'></div>;
}
