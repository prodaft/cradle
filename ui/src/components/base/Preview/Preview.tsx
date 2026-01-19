import DOMPurify from 'dompurify';

import Prism from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { handleLinkClick, NavigateHandler } from '@utils/editor/textEditor';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PreviewProps {
    htmlContent: string;
    currentLine?: number;
    setCurrentLine?: ((line: number) => void) | null;
}

export default function Preview({
    htmlContent,
    currentLine = 0,
    setCurrentLine = null,
}: PreviewProps) {
    const sanitizedContent = DOMPurify.sanitize(htmlContent);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    // Preview can be used in multiple routes, so we'll use a flexible approach
    const search = useSearch({ strict: false });
    const preventScrollRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);

    // Create a NavigateHandler adapter for handleLinkClick
    const navigateHandler: NavigateHandler = useCallback(
        (path: string) => {
            router.navigate({ to: path as any });
        },
        [router],
    );

    const previewRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (node) {
                setPreviewElement(node);
                // Set content immediately when ref is attached
                if (sanitizedContent) {
                    node.innerHTML = sanitizedContent;
                    Prism.highlightAllUnder(node);
                }
            }
        },
        [sanitizedContent],
    );

    useEffect(() => {
        if (htmlContent !== null) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
    }, [htmlContent]);

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
        if (previewElement && sanitizedContent) {
            previewElement.innerHTML = sanitizedContent;
            Prism.highlightAllUnder(previewElement);
        }
    }, [sanitizedContent, previewElement]);

    useEffect(() => {
        if (preventScrollRef.current) {
            preventScrollRef.current = false;
            return;
        }
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
    }, [currentLine, previewElement]);

    // Scroll to heading if heading parameter exists
    useEffect(() => {
        const headingId = (search as any).heading;
        if (headingId && previewElement) {
            try {
                // Escape the ID to handle special characters
                const escapedId = CSS.escape(headingId);
                const headingElement = previewElement.querySelector(`#${escapedId}`);
                if (headingElement) {
                    // Small delay to ensure content is fully rendered
                    setTimeout(() => {
                        headingElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        });
                    }, 100);
                }
            } catch (error) {
                // Silently fail - scroll error is non-critical
            }
        }
    }, [previewElement]);

    return (
        <>
            {isLoading ? (
                <div className='flex items-center justify-center min-h-screen'>
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
