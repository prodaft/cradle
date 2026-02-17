import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/use-api';
import { handleLinkClick, NavigateHandler } from '@/utils/editor/text-editor';
import { parseMarkdown } from '@/utils/parser/parse';
import type { FileReferenceWithNote } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import { useCallback, useEffect, useRef } from 'react';

interface StaticRenderProps {
    markdownContent: string;
    fileData: FileReferenceWithNote[];
}

/**
 * StaticRender component - renders markdown content statically (without editing)
 * with proper styling to match RichEditor appearance
 */
export default function StaticRender({ markdownContent, fileData }: StaticRenderProps) {
    const previewRef = useRef<HTMLDivElement>(null);
    const { entriesApi, fileTransferApi } = useApi();
    const router = useRouter();

    // Create a NavigateHandler adapter for handleLinkClick
    const navigateHandler: NavigateHandler = useCallback(
        (path: string) => {
            const dashboardMatch = path.match(/^\/dashboards\/([^/]+)\/([^/]+)\/?$/);
            if (dashboardMatch) {
                const [, subtype, name] = dashboardMatch;
                router.navigate({
                    to: '/dashboards/$subtype/$name',
                    params: {
                        subtype: decodeURIComponent(subtype),
                        name: decodeURIComponent(name),
                    },
                });
            } else {
                router.navigate({ to: path as any });
            }
        },
        [router],
    );

    const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
        handleLinkClick(navigateHandler)(event.nativeEvent);
    };

    const { data: htmlContent = '', isLoading } = useQuery({
        queryKey: ['parseMarkdown', markdownContent, fileData],
        queryFn: async () => {
            if (markdownContent === '') return '';
            const baseURL = import.meta.env.VITE_CRADLE_API_ENDPOINT || '';
            const result = await parseMarkdown(
                markdownContent,
                entriesApi,
                fileTransferApi,
                baseURL,
                fileData,
            );
            return result?.html ?? '';
        },
        meta: { showErrorToast: true },
        staleTime: Infinity,
    });

    // Single place: update preview DOM when HTML content changes
    useEffect(() => {
        const el = previewRef.current;
        if (el && htmlContent !== undefined) {
            el.innerHTML = DOMPurify.sanitize(htmlContent, {
                ADD_ATTR: ['style'],
            });
            Prism.highlightAllUnder(el);
        }
    }, [htmlContent]);

    const isInitialLoad = isLoading && !htmlContent;

    return (
        <div className='h-full w-full flex flex-col relative'>
            {isInitialLoad && (
                <div className='absolute inset-0 flex items-center justify-center z-10'>
                    <Spinner className='size-10' />
                </div>
            )}
            {/* Rendered markdown content with proper styling */}
            <ScrollArea className='h-full w-full'>
                <div
                    className='rich-editor markdown-body static-render'
                    ref={previewRef}
                    onClick={handleContentClick}
                ></div>
            </ScrollArea>
        </div>
    );
}
