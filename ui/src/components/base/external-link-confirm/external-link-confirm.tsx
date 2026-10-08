import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isFileDownloadUrl } from '@/utils/parser/extensions';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from 'react';

type OpenExternalLink = (url: string) => void;

const ExternalLinkConfirmContext = createContext<OpenExternalLink | null>(null);

function openInNewTab(url: string) {
    window.open(url, '_blank', 'noreferrer');
}

function parseUrl(url: string): URL | null {
    try {
        return new URL(url, window.location.href);
    } catch {
        return null;
    }
}

function needsConfirmation(url: string): boolean {
    const parsed = parseUrl(url);
    return parsed?.origin !== window.location.origin && !isFileDownloadUrl(url);
}

export function ExternalLinkConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState({ url: '', open: false });
    const openLink = useCallback<OpenExternalLink>((url) => {
        if (needsConfirmation(url)) {
            setPending({ url, open: true });
        } else {
            openInNewTab(url);
        }
    }, []);
    const close = () => setPending((prev) => ({ ...prev, open: false }));
    const hostname = parseUrl(pending.url)?.hostname;

    return (
        <ExternalLinkConfirmContext.Provider value={openLink}>
            {children}
            <AlertDialog
                open={pending.open}
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='flex items-center gap-2'>
                            <ArrowSquareOutIcon className='size-4 shrink-0' />
                            External link
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This opens a page outside CRADLE
                            {hostname ? (
                                <>
                                    {' '}
                                    on{' '}
                                    <span className='font-medium break-all text-foreground'>
                                        {hostname}
                                    </span>
                                </>
                            ) : null}{' '}
                            in a new tab.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <p className='max-h-32 overflow-y-auto bg-muted p-2 font-mono text-xs break-all'>
                        {pending.url}
                    </p>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                openInNewTab(pending.url);
                                close();
                            }}
                        >
                            Open
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ExternalLinkConfirmContext.Provider>
    );
}

export function useOpenExternalLink(): OpenExternalLink {
    const openLink = useContext(ExternalLinkConfirmContext);
    if (!openLink) {
        throw new Error(
            'useOpenExternalLink must be used within ExternalLinkConfirmProvider',
        );
    }
    return openLink;
}
