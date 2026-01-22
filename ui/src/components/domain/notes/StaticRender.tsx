import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/useApi';
import { parseMarkdown } from '@/utils/parser/parse';
import { handleLinkClick, NavigateHandler } from '@/utils/editor/textEditor';
import type { FileReferenceWithNote, NoteRetrieve } from '@services/cradle/models';
import { useRouter } from '@tanstack/react-router';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import { useCallback, useEffect, useState } from 'react';

interface StaticRenderProps {
    note: NoteRetrieve;
    markdownContent: string;
    fileData: FileReferenceWithNote[];
}

/**
 * StaticRender component - renders markdown content statically (without editing)
 * with proper styling to match RichEditor appearance
 */
export default function StaticRender({
    note,
    markdownContent,
    fileData,
}: StaticRenderProps) {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);
    const { entriesApi, fileTransferApi } = useApi();
    const router = useRouter();

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
                if (htmlContent) {
                    const sanitizedContent = DOMPurify.sanitize(htmlContent);
                    node.innerHTML = sanitizedContent;
                    Prism.highlightAllUnder(node);
                }
            }
        },
        [htmlContent],
    );

    const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
        handleLinkClick(navigateHandler)(event.nativeEvent);
    };

    // Parse markdown content
    useEffect(() => {
        let isMounted = true;

        const parseContent = async () => {
            setIsLoading(true);
            try {
                const baseURL = import.meta.env.VITE_CRADLE_API_ENDPOINT || '';
                const result = await parseMarkdown(
                    markdownContent,
                    entriesApi,
                    fileTransferApi,
                    baseURL,
                    fileData,
                    false,
                );

                if (isMounted && result) {
                    setHtmlContent(result.html);
                }
            } catch (error) {
                console.error('Failed to parse markdown:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        parseContent();

        return () => {
            isMounted = false;
        };
    }, [markdownContent, fileData, entriesApi, fileTransferApi]);

    // Update preview element when HTML content changes
    useEffect(() => {
        if (previewElement && htmlContent) {
            const sanitizedContent = DOMPurify.sanitize(htmlContent);
            previewElement.innerHTML = sanitizedContent;
            Prism.highlightAllUnder(previewElement);
        }
    }, [htmlContent, previewElement]);

    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full w-full py-8'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <div className='h-full w-full flex flex-col overflow-hidden'>
            {/* Rendered markdown content with proper styling */}
            <div className='flex-1 min-h-0 relative'>
                <ScrollArea className='h-full w-full'>
                    <div
                        className='rich-editor markdown-body'
                        style={{
                            padding: '1rem',
                            backgroundColor: 'transparent',
                        }}
                        ref={previewRef}
                        onClick={handleContentClick}
                    ></div>
                </ScrollArea>
            </div>
        </div>
    );
}
