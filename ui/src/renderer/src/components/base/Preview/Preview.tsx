import DOMPurify from 'dompurify';

import Prism from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
// import '@/utils/parser.js'; // TODO: Fix parser import

import { toast } from 'sonner';
import useCradleNavigate from '@hooks/navigation/useCradleNavigate';
import { handleLinkClick, NavigateHandler } from '@utils/editor/textEditor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const { navigate, navigateLink } = useCradleNavigate();
    const preventScrollRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Create a NavigateHandler adapter for handleLinkClick
    const navigateHandler: NavigateHandler = useCallback(
        (path: string) => {
            navigate(path);
        },
        [navigate],
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
        const headingId = searchParams.get('heading');
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
                console.error('Error scrolling to heading:', error);
            }
        }
    }, [searchParams, previewElement]);

    return (
        <>
            {isLoading ? (
                <div className='flex items-center justify-center min-h-screen'>
                    <div className='cradle-spinner-dot-pulse cradle-spinner-xl'>
                        <div className='cradle-spinner-pulse-dot'></div>
                    </div>
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
