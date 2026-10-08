import DOMPurify from 'dompurify';
import Prism from 'prismjs';

import { useOpenExternalLink } from '@/components/base/external-link-confirm/external-link-confirm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { handleLinkClick, NavigateHandler } from '@/utils/editor/text-editor';
import { useRouter, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface PreviewProps {
    html: string;
    currentLine?: number;
    setCurrentLine?: ((line: number) => void) | null;
    isLoading?: boolean;
}

export default function Preview({
    html,
    currentLine = 0,
    setCurrentLine = null,
    isLoading = false,
}: PreviewProps) {
    const sanitizedContent = useMemo(() => DOMPurify.sanitize(html), [html]);
    const router = useRouter();
    const openExternalLink = useOpenExternalLink();
    const search = useSearch({ strict: false });
    const headingId = (search as any).heading as string | undefined;
    const preventScrollRef = useRef(false);
    const previewRef = useRef<HTMLDivElement | null>(null);

    const navigateHandler: NavigateHandler = useCallback(
        (path: string) => {
            router.navigate({ to: path as any });
        },
        [router],
    );

    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;
        el.innerHTML = sanitizedContent;
        Prism.highlightAllUnder(el);
    }, [sanitizedContent]);

    const onLinkClick = handleLinkClick(navigateHandler, openExternalLink);

    const handleLineClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (onLinkClick(event.nativeEvent)) return;

        const targetElement = (event.target as HTMLElement).closest(
            '[data-source-line]',
        );
        if (targetElement && setCurrentLine) {
            const lineAttr = targetElement.getAttribute('data-source-line');
            const line = parseInt(lineAttr || '0', 10);
            if (!isNaN(line)) {
                preventScrollRef.current = true;
                setCurrentLine(line);
            }
        }
    };

    useEffect(() => {
        if (preventScrollRef.current) {
            preventScrollRef.current = false;
            return;
        }
        const previewElement = previewRef.current;
        if (!previewElement || currentLine === 0) return;

        const elements = Array.from(
            previewElement.querySelectorAll('[data-source-line]'),
        );
        if (elements.length === 0) return;

        const lineNumbers = elements.map((el) =>
            parseInt(el.getAttribute('data-source-line') || '0', 10),
        );
        const closestLine = lineNumbers.reduce((prev, curr) =>
            Math.abs(curr - currentLine) < Math.abs(prev - currentLine) ? curr : prev,
        );

        const targetElement = previewElement.querySelector(
            `[data-source-line="${closestLine}"]`,
        );
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentLine]);

    useEffect(() => {
        const previewElement = previewRef.current;
        if (!headingId || !previewElement) return;

        let timeoutId: number | undefined;
        try {
            const escapedId = CSS.escape(headingId);
            const headingElement = previewElement.querySelector(`#${escapedId}`);
            if (headingElement) {
                timeoutId = window.setTimeout(() => {
                    headingElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 100);
            }
        } catch (_error) {
            // Silently fail - scroll error is non-critical
        }

        return () => {
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
    }, [headingId]);

    return (
        <>
            {isLoading ? (
                <div className='flex items-center justify-center min-h-screen text-foreground'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <ScrollArea className='h-full w-full rounded-lg flex-1'>
                    <div
                        className='h-full w-full p-4 bg-transparent prose max-w-none break-words whitespace-normal dark:prose-invert line-numbers'
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        data-testid='preview'
                        ref={previewRef}
                        onClick={handleLineClick}
                        onAuxClick={(event) => onLinkClick(event.nativeEvent)}
                        id='preview-pane'
                    ></div>
                </ScrollArea>
            )}
        </>
    );
}
