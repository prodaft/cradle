import { useEffect, useRef, useState } from 'react';

import { parseAPIError } from '@/utils/api';
import { useRouter } from '@tanstack/react-router';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import type { EdgeRelation } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { Node } from './graphFilterUtils';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface FetchProgress {
    currentPage: number;
    totalPages: number;
    isPaused: boolean;
}

interface KnowledgeGraphSearchProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: { pause: () => void; resume: () => void }) => void;
}

export default function KnowledgeGraphSearch({
    addEdges,
    addNodes,
    addBoth,
    onLoadingChange,
    onFetchProgressChange,
    onFetchControlsReady,
}: KnowledgeGraphSearchProps) {
    const [isGraphFetching, setIsGraphFetching] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const { knowledgeGraphApi } = useApi();
    const router = useRouter();
    const hasFetchedRef = useRef(false);
    const isPausedRef = useRef(false);
    const resumeResolverRef = useRef<(() => void) | null>(null);
    const pageSize = 100;

    const fetchGraphPage = async (
        page: number,
    ): Promise<{
        nodes: Node[];
        edges: EdgeRelation[];
        colors: Record<string, string>;
        totalPages: number;
        hasMore: boolean;
    }> => {
        const response = await knowledgeGraphApi.knowledgeGraphRetrieveRaw({
            page,
            pageSize,
        });

        const rawData = await response.raw.json();

        const graphData = rawData.results;
        const totalPages = rawData.total_pages || 1;

        if (!graphData || !graphData.entries) {
            return {
                nodes: [],
                edges: [],
                colors: {},
                totalPages,
                hasMore: page < totalPages,
            };
        }

        const { entries, relations, colors } = graphData;

        let nodes: Node[] = [];

        if (entries) {
            try {
                const flattenedEntries = LinkTreeFlattener.flatten(entries);

                if (flattenedEntries && flattenedEntries.length > 0) {
                    nodes = flattenedEntries.map((e: any) => {
                        let label = `${e.subtype}: ${e.name || e.id}`;

                        // For note nodes, show "note: title"
                        if (e.subtype === 'note') {
                            label = `note: ${e.name || 'untitled'}`;
                        }

                        const nodeColor = colors?.[e.subtype] || 'var(--color-primary)';

                        return {
                            id: String(e.id),
                            degree: e.degree,
                            type: e.type || e.subtype,
                            subtype: e.subtype,
                            label,
                            color: nodeColor,
                            location: e.location,
                        };
                    });
                }
            } catch (e) {
                logger.error('[KnowledgeGraphSearch] Error processing entries:', e);
            }
        }

        const edges =
            relations && Array.isArray(relations) && relations.length > 0
                ? relations
                : [];

        return {
            nodes,
            edges,
            colors: colors || {},
            totalPages,
            hasMore: page < totalPages,
        };
    };

    // Query for first page to get total pages
    const { data: firstPageData, isPending: loading } = useQuery({
        queryKey: queryKeys.knowledgeGraph.graph(1),
        queryFn: () => fetchGraphPage(1),
        enabled: !hasFetchedRef.current,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch graph data',
        },
    });

    const isLoading = loading || isGraphFetching;
    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

    useEffect(() => {
        const controls = {
            pause: () => {
                isPausedRef.current = true;
                onFetchProgressChange?.({
                    currentPage: 0,
                    totalPages: 0,
                    isPaused: true,
                });
            },
            resume: () => {
                isPausedRef.current = false;
                if (resumeResolverRef.current) {
                    resumeResolverRef.current();
                    resumeResolverRef.current = null;
                }
            },
        };
        onFetchControlsReady?.(controls);
    }, [onFetchControlsReady, onFetchProgressChange]);

    // Fetch remaining pages when first page loads
    useEffect(() => {
        if (!firstPageData || hasFetchedRef.current) return;

        hasFetchedRef.current = true;
        setIsGraphFetching(true);

        // Process first page
        if (firstPageData.nodes.length > 0 || firstPageData.edges.length > 0) {
            if (addBoth) {
                addBoth(firstPageData.nodes, firstPageData.edges);
            } else {
                addNodes(firstPageData.nodes);
                addEdges(firstPageData.edges);
            }
        }

        // Fetch remaining pages incrementally
        const fetchRemainingPages = async () => {
            try {
                const totalPages = firstPageData.totalPages;
                
                for (let page = 2; page <= totalPages; page++) {
                    // Check if paused, wait for resume
                    if (isPausedRef.current) {
                        onFetchProgressChange?.({
                            currentPage: page - 1,
                            totalPages,
                            isPaused: true,
                        });
                        await new Promise<void>((resolve) => {
                            resumeResolverRef.current = resolve;
                        });
                    }

                    onFetchProgressChange?.({
                        currentPage: page,
                        totalPages,
                        isPaused: false,
                    });

                    const pageData = await fetchGraphPage(page);

                    if (pageData.nodes.length > 0 || pageData.edges.length > 0) {
                        if (addBoth) {
                            addBoth(pageData.nodes, pageData.edges);
                        } else {
                            addNodes(pageData.nodes);
                            addEdges(pageData.edges);
                        }
                    }
                }

                onFetchProgressChange?.(null);

                // If no data was processed
                if (
                    firstPageData.nodes.length === 0 &&
                    firstPageData.edges.length === 0
                ) {
                    setAlert({
                        show: true,
                        message: 'No graph data available.',
                        color: 'yellow',
                    });
                } else {
                    setAlert({ show: false, message: '', color: 'red' });
                }
            } catch (error: any) {
                logger.error(
                    '[KnowledgeGraphSearch] Error fetching remaining pages:',
                    error,
                );
                const parsed = await parseAPIError(error);
                setAlert({
                    show: true,
                    message:
                        parsed.detail || 'An error occurred while loading the graph.',
                    color: 'red',
                });
                onFetchProgressChange?.(null);
            } finally {
                setIsGraphFetching(false);
            }
        };

        fetchRemainingPages();
    }, [firstPageData, addBoth, addNodes, addEdges]);

    return (
        <div className='px-2 mt-2 w-full'>
            {alert.show && (
                <AlertComponent
                    variant={
                        alert.color === 'red' || alert.color === 'error'
                            ? 'destructive'
                            : 'default'
                    }
                >
                    <WarningCircleIcon weight="fill" />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}
        </div>
    );
}
