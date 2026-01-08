import { ComponentType, useEffect, useRef, useState } from 'react';

import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';

import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import { LinkTreeFlattener } from '@/utils/dashboard';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import type { EdgeRelation } from '@services/cradle/models';
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
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState<Alert>({
            show: false,
            message: '',
            color: 'red',
        });
        const { basePath } = useApi();
        const { getAccessToken } = useAuth();
        const { navigate } = useCradleNavigate();
        const hasFetchedRef = useRef(false);

        const fetchGraph = async () => {
            setLoading(true);
            setIsGraphFetching(true);

            try {
                // Make direct fetch call to bypass API client's incorrect parsing
                const token = await getAccessToken();
                const url = `${basePath}/notes/${noteId}/graph`;

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

                const graphData = await response.json();

                const { entries, relations, colors } = graphData || {};

                console.log('[NoteGraphSearch] Colors from API:', colors);

                // Process nodes and edges together to avoid race conditions
                let nodes: any[] = [];
                let hasData = false;

                if (entries) {
                    try {
                        const flattenedEntries = LinkTreeFlattener.flatten(entries);

                        console.log(
                            '[NoteGraphSearch] Flattened entries:',
                            flattenedEntries,
                        );

                        if (flattenedEntries && flattenedEntries.length > 0) {
                            nodes = flattenedEntries.map((e: any) => {
                                let label = `${e.subtype}: ${e.name || e.id}`;

                                // For note nodes, show "note: title"
                                if (e.subtype === 'note') {
                                    label = `note: ${e.name || 'untitled'}`;
                                }

                                const nodeColor = colors?.[e.subtype] || '#4A90E2';
                                console.log(
                                    `[NoteGraphSearch] Node ${e.id} (${e.subtype}): color=${nodeColor}`,
                                );

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
                        console.error('[NoteGraphSearch] Error processing entries:', e);
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
            } catch (error: any) {
                console.error(error);
                displayError(setAlert, navigate)(error);
            } finally {
                setLoading(false);
                setIsGraphFetching(false);
            }
        };

        // Automatically fetch graph on mount (only once)
        useEffect(() => {
            if (!hasFetchedRef.current) {
                hasFetchedRef.current = true;
                fetchGraph();
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [noteId]);

        return (
            <div className='px-2 mt-2 w-full'>
                {alert.show && (
                    <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                        <WarningCircle />
                        <AlertDescription>{alert.message}</AlertDescription>
                    </AlertComponent>
                )}
            </div>
        );
    };
}
