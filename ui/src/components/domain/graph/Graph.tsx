import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/contexts/ui';
import { logger } from '@/utils/logger';
import { Cosmograph } from '@cosmograph/react';
import { FunnelIcon, GearIcon, MagnifyingGlassIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { useDuckDb } from "duckdb-wasm-kit";
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edge, Node } from './graphFilterUtils';

interface GraphConfig {
    nodeRadiusCoefficient?: number;
    linkWidthCoefficient?: number;
    showLinks?: boolean;
    curvedLinks?: boolean;
    scaleLinksOnZoom?: boolean;
    showLinkWidthLegend?: boolean;
    simulationGravity?: number;
    simulationRepulsion?: number;
    simulationLinkSpring?: number;
    simulationLinkDistance?: number;
    simulationFriction?: number;
    simulationCluster?: number;
    simulationDecay?: number;
    randomSeed?: string | number;
}

interface FetchProgress {
    currentPage: number;
    totalPages: number;
    isPaused: boolean;
}

interface FetchControls {
    pause: () => void;
    resume: () => void;
}

interface GraphViewerProps {
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    config?: GraphConfig;
    nodes?: Node[];
    edges?: Edge[];
    onClearGraph?: () => void;
    activePanel?: 'explorer' | 'display' | 'filters' | null;
    onTogglePanel?: (panel: 'explorer' | 'display' | 'filters') => void;
    cosmographRef?: React.MutableRefObject<any>;
    isLoading?: boolean;
    fetchProgress?: FetchProgress | null;
    fetchControls?: FetchControls | null;
}

/**
 * Normalizes a node degree value to a size suitable for graph visualization.
 *
 * @param x - The input value (node degree)
 * @param inputMin - Minimum expected input value (default: 1)
 * @param inputMax - Maximum expected input value (default: 60)
 * @returns Normalized size value between outputMin (4) and outputMax (15)
 *
 * The function maps node degrees to visual sizes:
 * - Nodes with degree 1 (minimum connections) → size 4
 * - Nodes with degree 60+ (maximum connections) → size 15
 * - Values are clamped to the input range before normalization
 */
function normalize(x: number, inputMin: number, inputMax: number): number {
    // Clamp input to valid range
    x = Math.min(x, inputMax);
    x = Math.max(x, inputMin);

    // Output range for node sizes in the graph (increased for better visibility)
    const outputMin = 15;
    const outputMax = 40;

    // Shift to avoid division by zero and normalize
    const shifted = x - inputMin + 1;
    const maxShifted = inputMax - inputMin + 1;

    const normalized = shifted / maxShifted;
    return outputMin + normalized * (outputMax - outputMin);
}

function cssToHex(color: string): string {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '#000000';

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (e) {
        return '#000000';
    }
}

export default function GraphViewer({
    selectedNodes,
    setSelectedNodes,
    config = {},
    nodes = [],
    edges = [],
    onClearGraph,
    activePanel = null,
    onTogglePanel,
    cosmographRef: externalCosmographRef,
    isLoading = false,
    fetchProgress = null,
    fetchControls = null,
}: GraphViewerProps) {
    const { isDarkMode, activeTheme } = useTheme();
    const internalCosmographRef = useRef<any>(null);
    const cosmographRef = externalCosmographRef || internalCosmographRef;
    const [enableSimulation, setEnableSimulation] = useState(true);
    const { db: duckDB, loading: duckDBLoading, error: duckDBError } = useDuckDb();
    const [duckDBConnection, setDuckDBConnection] = useState<{ duckdb: any; connection: any } | null>(null);
    const [pointsTableName, setPointsTableName] = useState<string | null>(null);
    const [linksTableName, setLinksTableName] = useState<string | null>(null);
    const tablesRef = useRef<{ points: string | null; links: string | null }>({ points: null, links: null });
    const backgroundColor = useMemo(() => {
        const bgVar = activeTheme?.['--background'];
        return bgVar ? cssToHex(bgVar) : (isDarkMode ? '#000000' : '#ffffff');
    }, [activeTheme, isDarkMode]);

    // Filter out invalid nodes first
    const validNodes = useMemo(() => {
        const filtered = nodes.filter((node) => {
            const isValid = node.id != null && node.id !== '';
            if (!isValid) {
                logger.warn('[Graph] Filtered out invalid node:', { node });
            }
            return isValid;
        });

        if (filtered.length < nodes.length) {
            logger.warn('[Graph] Filtered out invalid nodes', {
                filteredCount: filtered.length,
                totalCount: nodes.length,
                removedCount: nodes.length - filtered.length,
            });
        }

        return filtered;
    }, [nodes]);

    // Create a map from node id to index for efficient lookups
    const nodeIdToIndex = useMemo(() => {
        const map = new Map<string, number>();
        validNodes.forEach((node, index) => {
            map.set(node.id, index);
        });
        return map;
    }, [validNodes]);

    // Create a map from index to node for reverse lookups
    const indexToNode = useMemo(() => {
        const map = new Map<number, Node>();
        validNodes.forEach((node, index) => {
            map.set(index, node);
        });
        return map;
    }, [validNodes]);

    const pointsData = useMemo(() => {
        return validNodes.map((node, index) => {
            const point: any = {
                ...node,
                _index: index,
                _color: node.color || 'var(--color-primary)',
                _size: normalize(node.degree || 1, 1, 60),
                _label: node.label || node.id,
            };

            return point;
        });
    }, [validNodes]);

    // Prepare links data for Cosmograph v2
    const linksData = useMemo(() => {
        return edges
            .filter((edge) => {
                const sourceIndex = nodeIdToIndex.get(edge.source);
                const targetIndex = nodeIdToIndex.get(edge.target);
                return sourceIndex !== undefined && targetIndex !== undefined;
            })
            .map((edge) => ({
                ...edge,
                _sourceIndex: nodeIdToIndex.get(edge.source)!,
                _targetIndex: nodeIdToIndex.get(edge.target)!,
            }));
    }, [edges, nodeIdToIndex]);

    // onClick handles both point clicks and background clicks
    const onClick = useCallback(
        (
            index: number | undefined,
            pointPosition: [number, number] | undefined,
            event: MouseEvent,
        ) => {
            try {
                if (index === undefined || index === null) {
                    // Background click - clear selection
                    setSelectedNodes(new Set());
                    cosmographRef.current?.setFocusedPoint(undefined);
                    return;
                }

                const node = indexToNode.get(index);
                if (!node) {
                    logger.warn('[Graph] onClick: Node not found for index', { index });
                    return;
                }

                let clickedNodes = [node];
                if (cosmographRef.current != null && selectedNodes.has(node)) {
                    try {
                        const connectedIndices =
                            cosmographRef.current.getConnectedPointIndices(index);
                        if (connectedIndices) {
                            clickedNodes = connectedIndices
                                .map((i: number) => indexToNode.get(i))
                                .filter(Boolean) as Node[];
                            clickedNodes.unshift(node);
                        }
                    } catch (e) {
                        logger.warn('[Graph] Error getting connected points:', { error: e });
                    }
                }

                let newNodes = new Set([node]);
                if (event && (event.ctrlKey || event.metaKey)) {
                    newNodes = new Set([...selectedNodes]);
                }

                for (const n of clickedNodes) {
                    if (!newNodes.has(n)) {
                        newNodes.add(n);
                    }
                }

                try {
                    cosmographRef.current?.setFocusedPoint(index);
                } catch (e) {
                    logger.warn('[Graph] Error setting focused point:', { error: e });
                }

                setSelectedNodes(newNodes);

                // Open explorer panel when a node is clicked
                if (onTogglePanel && activePanel !== 'explorer') {
                    onTogglePanel('explorer');
                }
            } catch (error) {
                logger.error('[Graph] Error in onClick handler:', error);
            }
        },
        [
            indexToNode,
            selectedNodes,
            setSelectedNodes,
            cosmographRef,
            onTogglePanel,
            activePanel,
        ],
    );

    // onLinkClick handles link/connection clicks
    const onLinkClick = useCallback(
        (linkIndex: number, event: MouseEvent) => {
            try {
                const link = linksData[linkIndex];
                if (!link) {
                    logger.warn('[Graph] onLinkClick: Link not found for index', {
                        linkIndex,
                    });
                    return;
                }

                // Get source and target nodes
                const sourceNode = indexToNode.get(link._sourceIndex);
                const targetNode = indexToNode.get(link._targetIndex);

                // Select both nodes connected by the link
                const newNodes = new Set<Node>();
                if (sourceNode) newNodes.add(sourceNode);
                if (targetNode) newNodes.add(targetNode);

                setSelectedNodes(newNodes);

                // Open explorer panel when a connection is clicked
                if (onTogglePanel && activePanel !== 'explorer') {
                    onTogglePanel('explorer');
                }
            } catch (error) {
                logger.error('[Graph] Error in onLinkClick handler:', error);
            }
        },
        [linksData, indexToNode, setSelectedNodes, onTogglePanel, activePanel],
    );

    // Fit view when data changes (Cosmograph handles data updates automatically via props)
    useEffect(() => {
        if (!cosmographRef.current || pointsData.length === 0) return;

        // Debounce fit view to avoid excessive calls
        const fitTimer = setTimeout(() => {
            try {
                if (typeof cosmographRef.current?.fitView === 'function') {
                    cosmographRef.current.fitView(500, 0.1);
                }
            } catch (e) {
                logger.warn('[Graph] Could not fit view:', { error: e });
            }
        }, 300);

        return () => clearTimeout(fitTimer);
    }, [pointsData.length]);

    if (duckDBError) {
        return <div className='flex items-center justify-center h-full text-muted-foreground'>
            <div className='text-center'>
                <p className='text-lg mb-2'>Error loading DuckDB</p>
            </div>
        </div>
    }

    // Only render Cosmograph when we have valid data and DuckDB tables are ready
    const hasValidData = pointsData.length > 0 && !duckDBLoading && duckDBConnection !== null && pointsTableName !== null;

    const spaceSize = useMemo(() => {
        const nodeCount = pointsData.length;
        return Math.max(2048, Math.sqrt(nodeCount) * 150);
    }, [pointsData.length]);

    // Initialize DuckDB tables with points and links data
    useEffect(() => {
        let pointsTable: string | null = null;
        let linksTable: string | null = null;
        let connection: any = null;
        let isCancelled = false;

        async function initCosmographTables() {
            if (!duckDB || pointsData.length === 0) {
                // Reset state if no data
                setDuckDBConnection(null);
                setPointsTableName(null);
                setLinksTableName(null);
                return;
            }

            try {
                // Create a persistent connection that will be used by Cosmograph
                connection = await duckDB.connect();

                // Generate unique table names to avoid conflicts
                const timestamp = Date.now();
                pointsTable = `cosmograph_points_${timestamp}`;
                linksTable = `cosmograph_links_${timestamp}`;

                // Drop existing tables if they exist (cleanup from previous runs)
                try {
                    await connection.query(`DROP TABLE IF EXISTS ${pointsTable}`);
                    await connection.query(`DROP TABLE IF EXISTS ${linksTable}`);
                } catch (e) {
                    // Ignore errors if tables don't exist
                }

                // Create points table with required columns
                // Using IF NOT EXISTS to avoid errors if table somehow already exists
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS ${pointsTable} (
                        id VARCHAR NOT NULL,
                        idx INTEGER NOT NULL,
                        color VARCHAR,
                        size DOUBLE,
                        label VARCHAR,
                        degree INTEGER
                    )
                `);

                // Insert points data in batches to avoid query size limits
                const batchSize = 1000;
                for (let i = 0; i < pointsData.length; i += batchSize) {
                    if (isCancelled) {
                        // Clean up if cancelled during insertion
                        if (connection && pointsTable) {
                            try {
                                await connection.query(`DROP TABLE IF EXISTS ${pointsTable}`);
                            } catch (e) {
                                // Ignore
                            }
                        }
                        return;
                    }
                    const batch = pointsData.slice(i, i + batchSize);
                    const values = batch.map((point) => {
                        const id = String(point.id).replace(/'/g, "''");
                        const color = String(point._color || '').replace(/'/g, "''");
                        const label = String(point._label || '').replace(/'/g, "''");
                        return `('${id}', ${point._index}, '${color}', ${point._size || 0}, '${label}', ${point.degree || 0})`;
                    }).join(', ');

                    await connection.query(`
                        INSERT INTO ${pointsTable} (id, idx, color, size, label, degree)
                        VALUES ${values}
                    `);
                }

                // Create links table with required columns
                if (linksData.length > 0 && !isCancelled) {
                    await connection.query(`
                        CREATE TABLE IF NOT EXISTS ${linksTable} (
                            source VARCHAR NOT NULL,
                            sourceidx INTEGER NOT NULL,
                            target VARCHAR NOT NULL,
                            targetidx INTEGER NOT NULL
                        )
                    `);

                    // Insert links data in batches
                    for (let i = 0; i < linksData.length; i += batchSize) {
                        if (isCancelled) {
                            // Clean up if cancelled during insertion
                            if (connection && linksTable) {
                                try {
                                    await connection.query(`DROP TABLE IF EXISTS ${linksTable}`);
                                } catch (e) {
                                    // Ignore
                                }
                            }
                            if (connection && pointsTable) {
                                try {
                                    await connection.query(`DROP TABLE IF EXISTS ${pointsTable}`);
                                } catch (e) {
                                    // Ignore
                                }
                            }
                            return;
                        }
                        const batch = linksData.slice(i, i + batchSize);
                        const values = batch.map((link) => {
                            const source = String(link.source).replace(/'/g, "''");
                            const target = String(link.target).replace(/'/g, "''");
                            return `('${source}', ${link._sourceIndex}, '${target}', ${link._targetIndex})`;
                        }).join(', ');

                        await connection.query(`
                            INSERT INTO ${linksTable} (source, sourceidx, target, targetidx)
                            VALUES ${values}
                        `);
                    }
                }

                // Only set state if not cancelled - this triggers Cosmograph to render
                // The tables must be fully created and populated before this point
                if (!isCancelled) {
                    // Ensure catalog is updated by doing a simple query
                    // This helps prevent "missing catalog" errors
                    try {
                        await connection.query(`SELECT 1 FROM ${pointsTable} LIMIT 1`);
                        if (linksData.length > 0 && linksTable) {
                            await connection.query(`SELECT 1 FROM ${linksTable} LIMIT 1`);
                        }
                    } catch (catalogError) {
                        logger.warn('[Graph] Catalog verification query failed, but continuing:', { error: catalogError });
                        // Continue anyway - the tables should still be accessible
                    }

                    // Store table names in ref for cleanup
                    tablesRef.current = { points: pointsTable, links: linksData.length > 0 ? linksTable : null };

                    // Store connection and table names - this must happen after all tables are created
                    // The connection will be kept alive for Cosmograph to use
                    // Important: We pass the same connection instance that created the tables
                    setDuckDBConnection({ duckdb: duckDB, connection });
                    setPointsTableName(pointsTable);
                    setLinksTableName(linksData.length > 0 ? linksTable : null);

                    logger.info('[Graph] DuckDB tables initialized and ready', {
                        pointsTable,
                        linksTable,
                        pointsCount: pointsData.length,
                        linksCount: linksData.length,
                    });
                } else {
                    // Clean up if we were cancelled
                    if (connection && pointsTable) {
                        try {
                            await connection.query(`DROP TABLE IF EXISTS ${pointsTable}`);
                        } catch (e) {
                            // Ignore
                        }
                    }
                    if (connection && linksTable) {
                        try {
                            await connection.query(`DROP TABLE IF EXISTS ${linksTable}`);
                        } catch (e) {
                            // Ignore
                        }
                    }
                }
            } catch (error) {
                logger.error('[Graph] Error initializing DuckDB tables:', error);
                // Clean up on error
                if (connection && pointsTable) {
                    try {
                        await connection.query(`DROP TABLE IF EXISTS ${pointsTable}`);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                if (connection && linksTable) {
                    try {
                        await connection.query(`DROP TABLE IF EXISTS ${linksTable}`);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                // Reset state on error
                if (!isCancelled) {
                    setDuckDBConnection(null);
                    setPointsTableName(null);
                    setLinksTableName(null);
                }
            }
        }

        initCosmographTables();

        // Cleanup function - only runs when component unmounts or dependencies change
        // This ensures tables persist for the entire Cosmograph lifecycle
        return () => {
            isCancelled = true;
            async function cleanup() {
                try {
                    // Clean up using ref (most recent) or local variables (fallback)
                    const tablesToDrop = tablesRef.current;
                    const pointsToDrop = tablesToDrop.points || pointsTable;
                    const linksToDrop = tablesToDrop.links || linksTable;

                    if (duckDB && (pointsToDrop || linksToDrop)) {
                        const cleanupConnection = await duckDB.connect();
                        if (pointsToDrop) {
                            await cleanupConnection.query(`DROP TABLE IF EXISTS ${pointsToDrop}`);
                        }
                        if (linksToDrop) {
                            await cleanupConnection.query(`DROP TABLE IF EXISTS ${linksToDrop}`);
                        }
                    }
                } catch (error) {
                    logger.warn('[Graph] Error cleaning up DuckDB tables:', { error });
                }
            }
            cleanup();
        };
    }, [duckDB, pointsData, linksData]);

    return (
        <div className='w-full h-full bg-background relative overflow-hidden'>
            {hasValidData ? (
                <>
                    {/* Bottom status bar with stats and loading indicator */}
                    <div className='absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-md text-xs'>
                        <span className='text-muted-foreground'>
                            <span className='font-medium text-foreground'>{pointsData.length}</span> nodes
                        </span>
                        <span className='text-muted-foreground'>
                            <span className='font-medium text-foreground'>{linksData.length}</span> edges
                        </span>
                        {fetchProgress && (
                            <>
                                <span className='text-border'>|</span>
                                <Spinner className='size-3' />
                                <span className='text-muted-foreground'>
                                    {fetchProgress.currentPage}/{fetchProgress.totalPages}
                                    {fetchProgress.isPaused && ' (paused)'}
                                </span>
                                {fetchControls && (
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-5'
                                        onClick={() => {
                                            if (fetchProgress.isPaused) {
                                                fetchControls.resume();
                                            } else {
                                                fetchControls.pause();
                                            }
                                        }}
                                        title={fetchProgress.isPaused ? 'Resume loading' : 'Pause loading'}
                                    >
                                        {fetchProgress.isPaused ? (
                                            <PlayIcon className='size-3' weight="fill" />
                                        ) : (
                                            <PauseIcon className='size-3' weight="fill" />
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                    {/* Graph controls - left side */}
                    <div className='absolute top-2 left-2 z-10 flex flex-col gap-1'>
                        {/* Search Panel Toggle Button */}
                        {onTogglePanel && (
                            <Button
                                type='button'
                                variant={
                                    activePanel === 'explorer' ? 'outline' : 'outline'
                                }
                                size='icon'
                                className={`p-1.5 w-8 h-8 ${activePanel === 'explorer' ? 'border-primary' : ''
                                    }`}
                                title='Toggle explorer panel'
                                onClick={() => onTogglePanel('explorer')}
                            >
                                <MagnifyingGlassIcon size={16} weight="bold" />
                            </Button>
                        )}

                        {/* Display Panel Toggle Button */}
                        {onTogglePanel && (
                            <Button
                                type='button'
                                variant={
                                    activePanel === 'display' ? 'outline' : 'outline'
                                }
                                size='icon'
                                className={`p-1.5 w-8 h-8 ${activePanel === 'display' ? 'border-primary' : ''
                                    }`}
                                title='Toggle display panel'
                                onClick={() => onTogglePanel('display')}
                            >
                                <GearIcon size={16} weight="bold" />
                            </Button>
                        )}

                        {/* Filters Panel Toggle Button */}
                        {onTogglePanel && (
                            <Button
                                type='button'
                                variant={
                                    activePanel === 'filters' ? 'outline' : 'outline'
                                }
                                size='icon'
                                className={`p-1.5 w-8 h-8 ${activePanel === 'filters' ? 'border-primary' : ''
                                    }`}
                                title='Toggle filters panel'
                                onClick={() => onTogglePanel('filters')}
                            >
                                <FunnelIcon size={16} weight="bold" />
                            </Button>
                        )}

                        {/* Simulation Toggle Button */}
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='p-1.5 w-8 h-8'
                            title={
                                enableSimulation
                                    ? 'Pause simulation'
                                    : 'Resume simulation'
                            }
                            onClick={() => {
                                setEnableSimulation((prev) => !prev);
                            }}
                        >
                            {enableSimulation ? (
                                <PauseIcon size={16} weight="fill" />
                            ) : (
                                <PlayIcon size={16} weight="fill" />
                            )}
                        </Button>
                    </div>

                    {/* Zoom controls - top right */}
                    <div className='absolute top-2 right-2 z-10 flex flex-col gap-1'>
                        {/* Fit View Button */}
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='p-1.5 w-8 h-8'
                            title='Fit view to show all nodes'
                            onClick={() => {
                                try {
                                    if (cosmographRef.current) {
                                        // Reset selection
                                        cosmographRef.current.unselectAllPoints();
                                        setSelectedNodes(new Set());
                                        // Fit view
                                        if (
                                            typeof cosmographRef.current.zoomToFit ===
                                            'function'
                                        ) {
                                            cosmographRef.current.zoomToFit();
                                        } else if (
                                            typeof cosmographRef.current.fitView ===
                                            'function'
                                        ) {
                                            cosmographRef.current.fitView(250, 0.1);
                                        }
                                    }
                                } catch (error) {
                                    logger.error('[Graph] Error fitting view:', error);
                                }
                            }}
                        >
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <path d='m21 21-6-6m6 6v-4.8m0 4.8h-4.8'></path>
                                <path d='M3 16.2V21m0 0h4.8M3 21l6-6'></path>
                                <path d='M21 7.8V3m0 0h-4.8M21 3l-6 6'></path>
                                <path d='M3 7.8V3m0 0h4.8M3 3l6 6'></path>
                            </svg>
                        </Button>

                        <ButtonGroup
                            orientation='vertical'
                            aria-label='Media controls'
                            className='h-fit'
                        >
                            <Button
                                variant='outline'
                                size='icon-sm'
                                title='Zoom in'
                                onClick={() => {
                                    try {
                                        if (cosmographRef.current) {
                                            // Try multiple zoom methods
                                            if (
                                                typeof cosmographRef.current
                                                    .setZoomLevel === 'function'
                                            ) {
                                                const currentZoom =
                                                    cosmographRef.current.getZoomLevel?.() ||
                                                    1;
                                                cosmographRef.current.setZoomLevel(
                                                    currentZoom + 0.2,
                                                    250,
                                                );
                                            } else if (
                                                typeof cosmographRef.current.setZoom ===
                                                'function'
                                            ) {
                                                const currentZoom =
                                                    cosmographRef.current.getZoom?.() ||
                                                    1;
                                                cosmographRef.current.setZoom(
                                                    currentZoom * 1.2,
                                                );
                                            } else if (
                                                typeof cosmographRef.current.zoomBy ===
                                                'function'
                                            ) {
                                                cosmographRef.current.zoomBy(1.2);
                                            }
                                        }
                                    } catch (error) {
                                        logger.error(
                                            '[Graph] Error zooming in:',
                                            error,
                                        );
                                    }
                                }}
                            >
                                <PlusIcon />
                            </Button>
                            <Button
                                variant='outline'
                                size='icon-sm'
                                title='Zoom out'
                                onClick={() => {
                                    try {
                                        if (cosmographRef.current) {
                                            // Try multiple zoom methods
                                            if (
                                                typeof cosmographRef.current
                                                    .setZoomLevel === 'function'
                                            ) {
                                                const currentZoom =
                                                    cosmographRef.current.getZoomLevel?.() ||
                                                    1;
                                                cosmographRef.current.setZoomLevel(
                                                    Math.max(0.1, currentZoom - 0.2),
                                                    250,
                                                );
                                            } else if (
                                                typeof cosmographRef.current.setZoom ===
                                                'function'
                                            ) {
                                                const currentZoom =
                                                    cosmographRef.current.getZoom?.() ||
                                                    1;
                                                cosmographRef.current.setZoom(
                                                    currentZoom * 0.8,
                                                );
                                            } else if (
                                                typeof cosmographRef.current.zoomBy ===
                                                'function'
                                            ) {
                                                cosmographRef.current.zoomBy(0.8);
                                            }
                                        }
                                    } catch (error) {
                                        logger.error(
                                            '[Graph] Error zooming out:',
                                            error,
                                        );
                                    }
                                }}
                            >
                                <MinusIcon />
                            </Button>
                        </ButtonGroup>
                    </div>
                    <Cosmograph
                        ref={cosmographRef}
                        points={pointsTableName!}
                        links={config.showLinks !== false && linksTableName ? linksTableName : undefined}
                        pointIdBy='id'
                        pointIndexBy='idx'
                        pointColorBy='color'
                        pointLabelBy='label'
                        pointSizeBy='size'
                        linkSourceBy='source'
                        linkTargetBy='target'
                        linkSourceIndexBy='sourceidx'
                        linkTargetIndexBy='targetidx'
                        backgroundColor={backgroundColor}
                        duckDBConnection={duckDBConnection!}
                        pointGreyoutOpacity={0}
                        pointSizeRange={[
                            15 * (config.nodeRadiusCoefficient ?? 1),
                            40 * (config.nodeRadiusCoefficient ?? 1),
                        ]}
                        showDynamicLabels={true}
                        spaceSize={spaceSize}
                        enableSimulation={enableSimulation}
                        simulationGravity={config.simulationGravity}
                        simulationRepulsion={config.simulationRepulsion}
                        simulationLinkSpring={config.simulationLinkSpring}
                        simulationLinkDistance={config.simulationLinkDistance}
                        simulationFriction={config.simulationFriction}
                        simulationCluster={config.simulationCluster}
                        simulationDecay={config.simulationDecay}
                        randomSeed={config.randomSeed}
                        fitViewOnInit={true}
                        fitViewDelay={250}
                        linkColor='var(--color-muted-foreground)'
                        focusedPointRingColor='var(--color-primary)'
                        linkWidthRange={[
                            4 * (config.linkWidthCoefficient ?? 1),
                            4 * (config.linkWidthCoefficient ?? 1),
                        ]}
                        curvedLinks={config.curvedLinks ?? false}
                        onClick={onClick}
                        onLinkClick={onLinkClick}
                        selectPointOnClick={false}
                        focusPointOnClick={true}
                        scalePointsOnZoom={false}
                    />
                </>
            ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground'>
                    <div className='text-center'>
                        {isLoading ? (
                            <>
                                <Spinner className='size-8 mx-auto mb-3' />
                                <p className='text-lg'>Loading graph data...</p>
                                {fetchProgress && (
                                    <p className='text-sm mt-1'>
                                        Page {fetchProgress.currentPage} of {fetchProgress.totalPages}
                                        {fetchProgress.isPaused && ' (paused)'}
                                    </p>
                                )}
                                {fetchControls && fetchProgress && (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='mt-3'
                                        onClick={() => {
                                            if (fetchProgress.isPaused) {
                                                fetchControls.resume();
                                            } else {
                                                fetchControls.pause();
                                            }
                                        }}
                                    >
                                        {fetchProgress.isPaused ? (
                                            <>
                                                <PlayIcon className='size-4 mr-1' weight="fill" />
                                                Resume
                                            </>
                                        ) : (
                                            <>
                                                <PauseIcon className='size-4 mr-1' weight="fill" />
                                                Pause
                                            </>
                                        )}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <p className='text-lg mb-2'>No graph data available</p>
                                <p className='text-sm'>Add nodes to visualize the graph</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
