export function getSaveStatus(
    markdownContent: string,
    isSaving: boolean,
    isDirty: boolean,
): 'empty' | 'saving' | 'unsaved' | 'saved' {
    if (!markdownContent || markdownContent.trim().length === 0) {
        return 'empty';
    }
    if (isSaving) {
        return 'saving';
    }
    if (isDirty) {
        return 'unsaved';
    }
    return 'saved';
}
