import type { components } from '@services/openapi/schema';

export type Entry = components['schemas']['Entry'];
export type NoteRetrieve = components['schemas']['NoteRetrieve'];
export type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

/**
 * A generic select option used in form dropdowns.
 */
export interface SelectOption<T = string> {
    value: T;
    label: string;
}
