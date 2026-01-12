import { useEffect, useRef, useState } from 'react';

import { parseAPIError } from '@/utils/api';
import { useRouter } from '@tanstack/react-router';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import type { EdgeRelation } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { WarningCircle } from 'iconoir-react';
import { Node } from './graphFilterUtils';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface KnowledgeGraphSearchProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
}

export default function KnowledgeGraphSearch({
    addEdges,
    addNodes,
    addBoth,
}: KnowledgeGraphSearchProps) {
    const [isGraphFetching, setIsGraphFetching] = useState(false);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const { basePath } = useApi();
    const { getAccessToken } = useAuthActions();
    const router = useRouter();
    const hasFetchedRef = useRef(false);
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
        const token = await getAccessToken();
        const url = `${basePath}/knowledge-graph/?page=${page}&page_size=${pageSize}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        const graphData = responseData.results || responseData;
        const { entries, relations, colors } = graphData || {};

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
            totalPages: responseData.total_pages || 1,
            hasMore: page < (responseData.total_pages || 1),
        };
    };

    // Query for first page to get total pages
    const {
        data: firstPageData,
        isPending: loading,
        error,
    } = useQuery({
        queryKey: queryKeys.knowledgeGraph.graph(1),
        queryFn: () => fetchGraphPage(1),
        enabled: !hasFetchedRef.current,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch graph data',
        },
    });

    // Handle errors
    useEffect(() => {
        if (error) {
            (async () => {
                logger.error(
                    '[KnowledgeGraphSearch] Error fetching graph data:',
                    error,
                );
                const parsed = await parseAPIError(error);

                // Handle 401 errors with navigation
                if (parsed.status === 401) {
                    setAlert({
                        show: true,
                        message: 'Your session has expired. Please log back in.',
                        color: 'red',
                    });
                    router.navigate({ to: '/login' });
                    return;
                }

                // Set alert with error message
                setAlert({
                    show: true,
                    message:
                        parsed.detail || 'An error occurred while loading the graph.',
                    color: 'red',
                });
            })();
        }
    }, [error, router]);

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
                for (let page = 2; page <= firstPageData.totalPages; page++) {
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
                    <WarningCircle />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}
        </div>
    );
}
