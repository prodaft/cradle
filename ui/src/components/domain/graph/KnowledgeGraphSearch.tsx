import { useEffect, useRef, useState } from 'react';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import { WarningCircleIcon } from '@phosphor-icons/react';
import type { EdgeRelation } from '@services/cradle/models';
import { useQuery } from '@tanstack/react-query';
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
    onLoadingChange?: (isLoading: boolean) => void;
}

export default function KnowledgeGraphSearch({
    addEdges,
    addNodes,
    addBoth,
    onLoadingChange,
}: KnowledgeGraphSearchProps) {
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const appliedRef = useRef(false);
    const { knowledgeGraphApi } = useApi();

    const { data, isPending: loading } = useQuery({
        queryKey: [...queryKeys.knowledgeGraph.all, 'full'],
        queryFn: async () => {
            const response = await knowledgeGraphApi.knowledgeGraphRetrieveRaw({});
            const rawData = await response.raw.json();
            const graphData = rawData.results;

            if (!graphData?.entries) {
                return { nodes: [], edges: [], colors: {} };
            }

            const entries = graphData.entries;
            const relations = graphData.relations;
            const colors = graphData.colors ?? {};
            let nodes: Node[] = [];

            try {
                const flattenedEntries = LinkTreeFlattener.flatten(entries);
                if (flattenedEntries?.length > 0) {
                    const byId = new Map<string, Node>();
                    for (const e of flattenedEntries) {
                        const id = e.id != null ? String(e.id) : '';
                        if (!id || byId.has(id)) continue;
                        const label =
                            e.subtype === 'note'
                                ? `note: ${e.name || 'untitled'}`
                                : `${e.subtype}: ${e.name || e.id}`;
                        byId.set(id, {
                            id,
                            degree: e.degree,
                            type: e.type || e.subtype,
                            subtype: e.subtype,
                            label,
                            color: colors?.[e.subtype] || 'var(--color-primary)',
                            location: e.location,
                        });
                    }
                    nodes = Array.from(byId.values());
                }
            } catch (e) {
                logger.error('[KnowledgeGraphSearch] Error processing entries:', e);
            }

            const edges =
                Array.isArray(relations) && relations.length > 0 ? relations : [];

            return { nodes, edges, colors };
        },
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch graph data',
        },
    });

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        if (!data || appliedRef.current) return;
        appliedRef.current = true;

        if (data.nodes.length > 0 || data.edges.length > 0) {
            if (addBoth) {
                addBoth(data.nodes, data.edges);
            } else {
                addNodes(data.nodes);
                addEdges(data.edges);
            }
            setAlert({ show: false, message: '', color: 'red' });
        } else {
            setAlert({
                show: true,
                message: 'No graph data available.',
                color: 'yellow',
            });
        }
    }, [data, addBoth, addNodes, addEdges]);

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
                    <WarningCircleIcon weight='fill' />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}
        </div>
    );
}
