import { ComponentType, useEffect, useRef, useState } from 'react';

import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { logger } from '@/utils/logger';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { $api } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { Node } from './graphFilterUtils';

type EdgeRelation = components['schemas']['EdgeRelation'];

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface NoteGraphSearchProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
    onLoadingChange?: (isLoading: boolean) => void;
}

export default function NoteGraphSearch(
    noteId: string,
): ComponentType<NoteGraphSearchProps> {
    return function NoteGraphSearchComponent({
        addEdges,
        addNodes,
        addBoth,
        onLoadingChange,
    }: NoteGraphSearchProps) {
        const [alert, setAlert] = useState<Alert>({
            show: false,
            message: '',
            color: 'red',
        });
        const lastAppliedFetchAtRef = useRef<number>(0);

        // Query for note graph data
        const {
            data: graphData,
            isPending,
            dataUpdatedAt,
        } = $api.useQuery(
            'get',
            '/notes/{note_id}/graph/',
            { params: { path: { note_id: noteId } } },
            {
                enabled: !!noteId,
                meta: {
                    showErrorToast: true,
                },
            },
        );

        useEffect(() => {
            onLoadingChange?.(isPending);
        }, [isPending, onLoadingChange]);

        // Process graph data when it loads (re-run on refetch / new dataUpdatedAt)
        useEffect(() => {
            if (!graphData || dataUpdatedAt === 0) return;
            if (lastAppliedFetchAtRef.current === dataUpdatedAt) return;
            lastAppliedFetchAtRef.current = dataUpdatedAt;

            try {
                const { entries, relations, colors } = graphData;

                // Process nodes and edges together to avoid race conditions
                let nodes: Node[] = [];
                let hasData = false;

                if (entries) {
                    try {
                        const flattenedEntries = LinkTreeFlattener.flatten(entries);

                        if (flattenedEntries && flattenedEntries.length > 0) {
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
                                    color:
                                        typeof colors?.[e.subtype] === 'string'
                                            ? (colors?.[e.subtype] as string)
                                            : 'var(--color-primary)',
                                    location: e.location,
                                });
                            }
                            nodes = Array.from(byId.values());
                            if (nodes.length > 0) hasData = true;
                        }
                    } catch (e) {
                        logger.error('Note graph: parse search entries failed', e);
                    }
                }

                const edges: EdgeRelation[] =
                    relations && Array.isArray(relations) && relations.length > 0
                        ? (relations as unknown as EdgeRelation[])
                        : [];
                if (edges.length > 0) {
                    hasData = true;
                }

                // Add nodes and edges together atomically using addBoth if available
                if (nodes.length > 0 || edges.length > 0) {
                    if (addBoth) {
                        addBoth(nodes, edges);
                    } else {
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
            } catch (e) {
                logger.error('Note graph: apply graph data failed', e);
            }
        }, [graphData, dataUpdatedAt, addBoth, addNodes, addEdges]);

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
    };
}
