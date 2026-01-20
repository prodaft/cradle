import { ComponentType, useEffect, useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import type { EdgeRelation, SubGraph } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { Node } from './graphFilterUtils';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface NoteGraphSearchProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
}

export default function NoteGraphSearch(
    noteId: string,
): ComponentType<NoteGraphSearchProps> {
    return function NoteGraphSearchComponent({
        addEdges,
        addNodes,
        addBoth,
    }: NoteGraphSearchProps) {
        const [isGraphFetching, setIsGraphFetching] = useState(false);
        const [alert, setAlert] = useState<Alert>({
            show: false,
            message: '',
            color: 'red',
        });
        const { notesApi } = useApi();
        const router = useRouter();
        const hasFetchedRef = useRef(false);

        // Query for note graph data
        const { data: graphData, isPending: loading } = useQuery<SubGraph>({
            queryKey: queryKeys.notes.detail(`${noteId}-graph`),
            queryFn: () => notesApi.notesGraphRetrieve({ noteId }),
            enabled: !hasFetchedRef.current,
            meta: {
                showErrorToast: true,
                errorMessage: 'Failed to fetch graph data',
            },
        });

        // Process graph data when it loads
        useEffect(() => {
            if (!graphData || hasFetchedRef.current) return;

            hasFetchedRef.current = true;
            setIsGraphFetching(true);

            try {
                const { entries, relations, colors } = graphData;

                // Process nodes and edges together to avoid race conditions
                let nodes: any[] = [];
                let hasData = false;

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

                                const nodeColor =
                                    colors?.[e.subtype] || 'var(--color-primary)';

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
                            hasData = true;
                        }
                    } catch (e) {
                        logger.error('[NoteGraphSearch] Error processing entries:', e);
                    }
                }

                const edges =
                    relations && Array.isArray(relations) && relations.length > 0
                        ? relations
                        : [];
                if (edges.length > 0) {
                    hasData = true;
                }

                // Add nodes and edges together atomically using addBoth if available
                if (nodes.length > 0 || edges.length > 0) {
                    if (addBoth) {
                        // Preferred: Add both atomically
                        addBoth(nodes, edges);
                    } else {
                        // Fallback: Add separately (may have race conditions)
                        addNodes(nodes);
                        addEdges(edges);
                    }
                }

                // If no data was processed
                if (!hasData) {
                    setAlert({
                        show: true,
                        message: 'No graph data available for this note.',
                        color: 'yellow',
                    });
                } else {
                    setAlert({ show: false, message: '', color: 'red' });
                }
            } finally {
                setIsGraphFetching(false);
            }
        }, [graphData, addBoth, addNodes, addEdges]);

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
    };
}
