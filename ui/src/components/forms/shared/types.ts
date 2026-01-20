/**
 * Shared types for form components
 */

/**
 * Select option type (matches existing Selector)
 */
export interface SelectOption<T = string | number> {
    value: T;
    label: string;
    [key: string]: any;
}
