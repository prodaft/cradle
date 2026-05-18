import DOMPurify from 'dompurify';
import Prism from 'prismjs';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { handleLinkClick, NavigateHandler } from '@/utils/editor/text-editor';
import { useRouter, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface PreviewProps {
    htmlContent: string;
    currentLine?: number;
    setCurrentLine?: ((line: number) => void) | null;
    isLoading?: boolean;
}

export default function Preview({
    htmlContent,
    currentLine = 0,
    setCurrentLine = null,
    isLoading = false,
}: PreviewProps) {
    const sanitizedContent = useMemo(
        () => DOMPurify.sanitize(htmlContent),
        [htmlContent],
    );
    const router = useRouter();
    // Preview can be used in multiple routes, so we'll use a flexible approach
    const search = useSearch({ strict: false });
    const headingId = (search as any).heading as string | undefined;
    const preventScrollRef = useRef(false);
    const previewRef = useRef<HTMLDivElement | null>(null);

    // Create a NavigateHandler adapter for handleLinkClick
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

    const handleLineClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (handleLinkClick(navigateHandler)(event.nativeEvent)) return;

        const targetElement = (event.target as HTMLElement).closest(
            '[data-source-line]',
        );
        if (targetElement && setCurrentLine) {
            const lineAttr = targetElement.getAttribute('data-source-line');
            const line = parseInt(lineAttr || '0', 10);
            if (!isNaN(line)) {
                // Prevent the scroll effect triggered by currentLine updates.
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

        // Get all elements with data-source-line.
        const elements = Array.from(
            previewElement.querySelectorAll('[data-source-line]'),
        );
        if (elements.length === 0) return;

        // Find the element whose data-source-line is closest to currentLine.
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

    // Scroll to heading if heading parameter exists
    useEffect(() => {
        const previewElement = previewRef.current;
        if (!headingId || !previewElement) return;

        let timeoutId: number | undefined;
        try {
            const escapedId = CSS.escape(headingId);
            const headingElement = previewElement.querySelector(`#${escapedId}`);
            if (headingElement) {
                // Small delay to ensure content is fully rendered
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
                        id='preview-pane'
                    ></div>
                </ScrollArea>
            )}
        </>
    );
}
