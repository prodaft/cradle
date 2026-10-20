import { CheckIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const SAVED_FEEDBACK_MS = 1500;

interface SettingsHeaderActionsContextValue {
    container: HTMLDivElement | null;
    setContainer: Dispatch<SetStateAction<HTMLDivElement | null>>;
}

const SettingsHeaderActionsContext =
    createContext<SettingsHeaderActionsContextValue | null>(null);

export function SettingsHeaderActionsProvider({ children }: { children: ReactNode }) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    return (
        <SettingsHeaderActionsContext.Provider value={{ container, setContainer }}>
            {children}
        </SettingsHeaderActionsContext.Provider>
    );
}

export function SettingsHeaderActionsTarget() {
    const context = useContext(SettingsHeaderActionsContext);

    return <div ref={context?.setContainer} className='flex items-center' />;
}

function useSettingsHeaderActionsContainer() {
    return useContext(SettingsHeaderActionsContext)?.container ?? null;
}

export function SettingsHeaderActionsPortal({ children }: { children: ReactNode }) {
    const container = useSettingsHeaderActionsContainer();

    return container ? createPortal(children, container) : null;
}

interface SettingsSaveButtonProps {
    isDirty: boolean;
    saving: boolean;
    /** Click handler; omit when `form` submits the form instead. */
    onSave?: () => void;
    /** Id of the form to submit. */
    form?: string;
}

export function SettingsSaveButton({
    isDirty,
    saving,
    onSave,
    form,
}: SettingsSaveButtonProps) {
    const [prevSaving, setPrevSaving] = useState(saving);
    const [saved, setSaved] = useState(false);

    // Some forms only turn clean once the refetch resets them, so the end of a save is
    // latched and "Saved" shows when the form becomes clean; a failed save stays dirty.
    if (saving !== prevSaving) {
        setPrevSaving(saving);
        setSaved(prevSaving);
    }

    useEffect(() => {
        if (!saved) return;
        const timer = setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
        return () => clearTimeout(timer);
    }, [saved]);

    const showSaved = saved && !isDirty && !saving;

    return (
        <Button
            type={form ? 'submit' : 'button'}
            form={form}
            variant={showSaved ? 'outline' : 'default'}
            disabled={saving || !isDirty}
            onClick={onSave}
        >
            {saving ? (
                <Spinner data-icon='inline-start' />
            ) : showSaved ? (
                <CheckIcon data-icon='inline-start' weight='bold' />
            ) : (
                <FloppyDiskIcon data-icon='inline-start' weight='bold' />
            )}
            {saving ? 'Saving…' : showSaved ? 'Saved' : 'Save'}
        </Button>
    );
}
