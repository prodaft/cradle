import { useEffect, useRef, useState } from 'react';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { queryKeys } from '@/hooks/query';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useQuery } from '@tanstack/react-query';
import { Node } from './graphFilterUtils';

type EdgeRelation = components['schemas']['EdgeRelation'];

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

    const { data, isLoading } = useQuery({
        queryKey: [...queryKeys.knowledgeGraph.all, 'full'],
        queryFn: async () => {
            const {
                data: responseData,
                error,
                response,
            } = await fetchClient.GET('/knowledge-graph/');
            if (error) throw { response, error };

            const graphData = responseData!.results;

            if (!graphData?.entries) {
                return { nodes: [], edges: [], colors: {} };
            }

            const entries = graphData.entries;
            const relations = graphData.relations;
            const colors = (graphData.colors ?? {}) as Record<string, string>;
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
                logger.error('Knowledge graph: parse search entries failed', e);
            }

            const edges: EdgeRelation[] =
                Array.isArray(relations) && relations.length > 0
                    ? (relations as unknown as EdgeRelation[])
                    : [];

            return { nodes, edges, colors };
        },
        meta: {
            showErrorToast: true,
        },
    });

    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

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
