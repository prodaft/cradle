export function getSaveStatus(
    markdownContent: string,
    saving: boolean,
    hasUnsavedChanges: boolean,
): 'empty' | 'saving' | 'unsaved' | 'saved' {
    if (!markdownContent || markdownContent.trim().length === 0) {
        return 'empty';
    }
    if (saving) {
        return 'saving';
    }
    if (hasUnsavedChanges) {
        return 'unsaved';
    }
    return 'saved';
}
