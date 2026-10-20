export function getSaveStatus(
    markdownContent: string,
    isSaving: boolean,
    isDirty: boolean,
    hasSaveError: boolean,
): 'empty' | 'saving' | 'error' | 'unsaved' | 'saved' {
    if (!markdownContent || markdownContent.trim().length === 0) {
        return 'empty';
    }
    if (isSaving) {
        return 'saving';
    }
    if (isDirty && hasSaveError) {
        return 'error';
    }
    if (isDirty) {
        return 'unsaved';
    }
    return 'saved';
}
