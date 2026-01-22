import Pagination from '@/components/base/Pagination/Pagination';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { defineStepper } from '@/components/ui/stepper';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import useApi from '@/hooks/api/useApi';
import { createDashboardLink } from '@/utils/dashboard';
import {
    ActionBarSearch,
    ActionBar as BaseActionBar,
} from '@components/base/ActionBar/ActionBar';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { CaretDownIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { toast } from 'sonner';

interface Alert {
    show: boolean;
    message: string;
    color: string;
    button?: {
        text: string;
        onClick: () => void;
    };
}

interface Result {
    id?: number;
    name: string;
    subtype: string;
    depth: number;
    color?: string;
}

interface RelationsProps {
    obj: {
        id?: number;
        type?: string;
        [key: string]: any;
    };
}

const truncate = (str: string, n: number) => {
    return str.length > n ? str.slice(0, n - 1) + '...' : str;
};

interface RelationRowProps {
    srcId: number;
    result: Result;
    isSelected: boolean;
    onToggleSelection: (checked: boolean) => void;
    isOpen: boolean;
    onToggleOpen: (open: boolean) => void;
    router: any;
}

function RelationRow({ srcId, result, isSelected, onToggleSelection, isOpen, onToggleOpen, router }: RelationRowProps) {
    const dashboardLink = createDashboardLink(result);
    const { knowledgeGraphApi } = useApi();

    const isSameEntry = result.id !== undefined && result.id === srcId;
    const canExpand = !isSameEntry && result.id !== undefined;

    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    const { data: pathData, isPending: isPathPending } = useQuery({
        queryKey: ['graph', 'paths', { src: String(srcId), dst: result.id }],
        queryFn: () => knowledgeGraphApi.knowledgeGraphPathsRetrieve({
            src: String(srcId),
            dsts: [result.id!],
        }),
        enabled: isOpen && canExpand,
    });

    const pathSteps = useMemo(() => {
        if (!pathData) return [];

        const nodes = new Map<number, { id: number; name: string; subtype: string; color?: string }>();

        const processEntries = (entryMap: any) => {
            Object.entries(entryMap).forEach(([subtype, entries]: [string, any]) => {
                entries.forEach((entry: any) => {
                    if (typeof entry === 'object' && entry !== null) {
                        nodes.set(entry.id, {
                            id: entry.id,
                            name: entry.name,
                            subtype: subtype,
                            color: pathData.colors[subtype],
                        });
                    }
                });
            });
        };

        processEntries(pathData.entries.entities);
        processEntries(pathData.entries.artifacts);

        // Path reconstruction logic
        const adj = new Map<number, number[]>();
        // Add edges in both directions to ensure connectivity for the path finding
        // since the graph is effectively undirected for "connection" purposes here
        pathData.relations.forEach((rel: any) => {
            if (!adj.has(rel.src)) adj.set(rel.src, []);
            if (!adj.has(rel.dst)) adj.set(rel.dst, []);
            adj.get(rel.src)!.push(rel.dst);
            adj.get(rel.dst)!.push(rel.src);
        });

        // BFS
        const queue: number[][] = [[srcId]];
        const visited = new Set<number>([srcId]);
        let foundPath: number[] = [];

        if (srcId === result.id) {
            foundPath = [srcId];
        } else {
            while (queue.length > 0) {
                const path = queue.shift()!;
                const curr = path[path.length - 1];

                if (curr === result.id) {
                    foundPath = path;
                    break;
                }

                const neighbors = adj.get(curr) || [];
                for (const next of neighbors) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push([...path, next]);
                    }
                }
            }
        }

        if (foundPath.length === 0) {
            // Fallback: just show all nodes if no path found (disconnected subgraph?)
            // Or maybe just the start and end?
            // Let's fallback to just showing all nodes as before if path finding fails
            return Array.from(nodes.values()).map(node => ({
                id: String(node.id),
                title: node.name,
                description: node.subtype,
                entryId: node.id,
                color: node.color,
                subtype: node.subtype
            }));
        }

        return foundPath.map(id => {
            const node = nodes.get(id);
            if (!node) return null;
            return {
                id: String(node.id),
                title: node.name,
                description: node.subtype,
                entryId: node.id,
                color: node.color,
                subtype: node.subtype
            };
        }).filter(Boolean) as any[];

    }, [pathData, srcId, result.id]);

    useEffect(() => {
        if (pathSteps.length > 0 && !activeStepId) {
            setActiveStepId(pathSteps[0].id);
        }
    }, [pathSteps, activeStepId]);

    const activeStep = useMemo(() =>
        pathSteps.find(s => s.id === activeStepId) || (pathSteps.length > 0 ? pathSteps[0] : null)
        , [pathSteps, activeStepId]);

    const handleNavigate = (e: MouseEvent) => {
        e.stopPropagation();
        router.navigate({ to: dashboardLink as any });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={onToggleOpen} asChild disabled={!canExpand}>
            <>
                <CollapsibleTrigger asChild>
                    <TableRow className={`cursor-pointer hover:bg-muted/50 ${!canExpand ? 'opacity-70' : ''}`}>
                        <TableCell onClick={(e) => e.stopPropagation()} className="w-[50px]">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => onToggleSelection(!!checked)}
                                aria-label="Select row"
                            />
                        </TableCell>
                        <TableCell onClick={handleNavigate}>
                            <Badge
                                className={`rounded-full ${!result.color ? 'bg-muted' : ''}`}
                                style={
                                    result.color
                                        ? {
                                            backgroundColor: result.color,
                                        }
                                        : undefined
                                }
                            >
                                {result.subtype}
                            </Badge>
                        </TableCell>
                        <TableCell onClick={handleNavigate}>
                            <div className='flex items-center gap-2'>
                                <span className='truncate block max-w-[300px]'>
                                    {result.name}
                                </span>
                                <span className='text-muted-foreground text-xs ml-auto whitespace-nowrap'>
                                    {result.depth} step{result.depth !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="w-[50px]">
                            <div className='flex items-center justify-end'>
                                {canExpand && (
                                    <CaretDownIcon
                                        className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={4} className="p-0 border-b-0">
                            <div className="bg-muted/30 border-t">
                                <div className="p-4 flex flex-col gap-6">
                                    {isPathPending ? (
                                        <div className="flex justify-center p-4">
                                            <Spinner />
                                        </div>
                                    ) : pathSteps.length > 0 ? (
                                        <>
                                            <PathStepper
                                                steps={pathSteps}
                                                activeStepId={activeStepId || pathSteps[0].id}
                                                onStepClick={setActiveStepId}
                                            />
                                            {activeStep && (
                                                <div className="pt-4 border-t flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4" style={{
                                                            backgroundColor: activeStep.color ? activeStep.color : undefined
                                                        }}>
                                                            {activeStep.subtype}
                                                        </Badge>
                                                        <span className="text-sm font-semibold">{activeStep.title}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {/* Placeholder for future details */}
                                                        ID: {activeStep.entryId}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center p-4">
                                            No path found or error loading path.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </>
        </Collapsible>
    );
}

function PathStepper({ steps, activeStepId, onStepClick }: { steps: any[], activeStepId: string, onStepClick: (id: string) => void }) {
    const { Stepper } = useMemo(() => defineStepper(...(steps as any)), [steps]);

    return (
        <Stepper.Provider
            variant="horizontal"
            labelOrientation="vertical"
            initialStep={activeStepId}
            key={activeStepId}
        >
            <Stepper.Navigation>
                {steps.map(step => (
                    <Stepper.Step
                        key={step.id}
                        of={step.id}
                        onClick={() => onStepClick(step.id)}
                        className="p-0"
                    >
                        <Stepper.Title className="max-w-[120px] truncate" title={step.title} >
                            {truncate(step.title, 128)}
                        </Stepper.Title>
                        <Stepper.Description className="max-w-[120px] truncate" title={step.description}>
                            {step.description}
                        </Stepper.Description>
                    </Stepper.Step>
                ))}
            </Stepper.Navigation>
        </Stepper.Provider>
    );
}

export default function Relations({ obj }: RelationsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [depth, setDepth] = useState(2);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [results, setResults] = useState<Result[] | null>(null);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const [pageSize, setPageSize] = useState(10);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const { entriesApi, knowledgeGraphApi, accessApi } = useApi();

    const requestAccessMutation = useMutation({
        mutationFn: async (entities: string[]) => {
            await Promise.all(
                entities.map((entity) =>
                    accessApi.accessRequestCreate({
                        entityId: entity,
                        requestAccessRequest: {
                            entityId: entity,
                        },
                    }),
                ),
            );
        },
        meta: {
            successMessage: 'Access request submitted successfully',
        },
        onSuccess: () => {
            setInaccessibleEntities([]);
        },
    });

    const router = useRouter();

    // Query for entry subtypes
    const { data: entrySubtypesData } = useQuery({
        queryKey: ['entrySubtypes'],
        queryFn: () => entriesApi.entryClassesList({}),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load entry subtypes',
        },
    });

    const entrySubtypes = useMemo(() => {
        return (entrySubtypesData || []).map((c: any) => c.subtype);
    }, [entrySubtypesData]);

    const entryClassColors = useMemo(() => {
        const colors = new Map<string, string>();
        (entrySubtypesData || []).forEach((c: any) => {
            if (c.color) colors.set(c.subtype, c.color);
        });
        return colors;
    }, [entrySubtypesData]);

    const relationsQueryParams = useMemo(() => {
        if (!obj.id) return null;
        return {
            src: String(obj.id),
            depth: depth,
            page: page,
            pageSize: pageSize,
            query: searchQuery || undefined,
            wildcard: true,
        };
    }, [obj.id, depth, page, pageSize, searchQuery]);

    const { data: relationsData, isPending } = useQuery({
        queryKey: [
            'graph',
            'neighbors',
            {
                src: String(obj.id),
                depth,
                page,
                pageSize,
                query: searchQuery,
                filters: entrySubtypeFilters,
            },
        ],
        queryFn: () => {
            if (entrySubtypeFilters.length === 0) {
                return knowledgeGraphApi.knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    page: page,
                    pageSize: pageSize,
                    query: searchQuery,
                    wildcard: true,
                });
            } else {
                return knowledgeGraphApi.knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    page: page,
                    pageSize: pageSize,
                    query: searchQuery,
                });
            }
        },
        enabled: !!obj.id && !!relationsQueryParams,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch relations',
        },
    });

    // Process relations data
    useEffect(() => {
        if (relationsData) {
            setHasNextPage(relationsData.hasNext);
            const resultsWithDepth = relationsData.results as unknown as Result[];
            if (entrySubtypeFilters.length === 0) {
                resultsWithDepth.sort((a, b) => a.depth - b.depth);
                setResults(resultsWithDepth);
            } else {
                const filteredResults =
                    entrySubtypeFilters.length > 0
                        ? resultsWithDepth.filter((r) =>
                            entrySubtypeFilters.includes(r.subtype),
                        )
                        : resultsWithDepth;
                setResults(filteredResults);
            }
        } else {
            setResults([]);
        }
    }, [relationsData, entrySubtypeFilters]);

    // Query for inaccessible entities
    const { data: inaccessibleData } = useQuery({
        queryKey: [
            'graph',
            'inaccessible',
            {
                src: String(obj.id),
                depth,
            },
        ],
        queryFn: () =>
            knowledgeGraphApi.knowledgeGraphInaccessibleRetrieve({
                src: String(obj.id),
                depth: depth,
            }),
        enabled: !!obj.id && depth > 0,
        meta: {
            suppressNotification: true,
            errorMessage: 'Failed to check inaccessible entities',
        },
    });

    const handleRequestAccess = useCallback(
        (entities: string[]) => () => {
            setIsRequestingAccess(true);
            requestAccessMutation.mutate(entities, {
                onSettled: () => {
                    setIsRequestingAccess(false);
                },
            });
        },
        [requestAccessMutation],
    );

    useEffect(() => {
        if (
            inaccessibleData?.inaccessible &&
            inaccessibleData.inaccessible.length > 0
        ) {
            setInaccessibleEntities(inaccessibleData.inaccessible);
            setAlert({
                show: true,
                message: `${inaccessibleData.inaccessible.length} related ${inaccessibleData.inaccessible.length === 1 ? 'entity is' : 'entities are'} not accessible`,
                color: 'yellow',
                button: {
                    text: 'Request Access',
                    onClick: handleRequestAccess(inaccessibleData.inaccessible),
                },
            });
        }
    }, [inaccessibleData, handleRequestAccess]);

    const performSearch = useCallback((_depth: number, page: number) => {
        setAlert((prev) => ({ ...prev, show: false }));
        setInaccessibleEntities([]);
        setPage(page);
    }, []);

    const handleDepthChange = (value: string) => {
        const newDepth = parseInt(value, 10);
        setDepth(newDepth);

        if (page === 1) {
            performSearch(newDepth, 1);
        } else {
            setPage(1);
        }
    };

    const copyToCSV = useCallback(() => {
        if (!results || results.length === 0 || selectedIds.size === 0) return;

        let csvContent = '"type","name"\n';

        const itemsToCopy = results.filter(
            (r) => r.id !== undefined && selectedIds.has(r.id),
        );

        if (itemsToCopy.length > 0) {
            itemsToCopy.forEach((result) => {
                const type = String(result.subtype).replace(/"/g, '""');
                const name = String(result.name).replace(/"/g, '""');
                csvContent += `"${type}","${name}"\n`;
            });
        }
        navigator.clipboard
            .writeText(csvContent)
            .then(() => {
                toast.success(
                    `Copied ${itemsToCopy.length} relation${itemsToCopy.length > 1 ? 's' : ''} to clipboard`,
                );
            })
            .catch(() => {
                toast.error('Failed to copy to clipboard');
            });
    }, [results, selectedIds]);

    // Trigger search when page changes
    useEffect(() => {
        performSearch(depth, page);
    }, [page, depth, pageSize, performSearch]);

    // Reset to page 1 when pageSize changes
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    // Handlers for table
    const toggleAllSelection = (checked: boolean) => {
        if (checked && results) {
            const allIds = results.map(r => r.id).filter((id): id is number => id !== undefined);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleRowSelection = (id: number, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleRowExpansion = (id: number, open: boolean) => {
        const newExpanded = new Set(expandedRows);
        if (open) {
            newExpanded.add(id);
        } else {
            newExpanded.delete(id);
        }
        setExpandedRows(newExpanded);
    };


    return (
        <div className='flex flex-col space-y-4'>
            {alert.show && (
                <AlertComponent
                    variant={
                        alert.color === 'red' || alert.color === 'error'
                            ? 'destructive'
                            : 'default'
                    }
                >
                    <WarningCircleIcon size={18} weight="bold" />
                    <AlertDescription>{alert.message}</AlertDescription>
                    {alert.button && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={alert.button.onClick}
                        >
                            {alert.button.text}
                        </Button>
                    )}
                </AlertComponent>
            )}

            <BaseActionBar
                left={
                    <div className='flex items-center gap-3'>
                        <ActionBarSearch
                            placeholder='Search relations...'
                            value={searchQuery}
                            defaultExpanded={Boolean(searchQuery)}
                            debounceMs={300}
                            onDebouncedChange={(value) => {
                                setSearchQuery(value);
                                performSearch(depth, 1);
                            }}
                            onSubmit={(value) => {
                                setSearchQuery(value ?? '');
                                performSearch(depth, 1);
                            }}
                            onClear={() => performSearch(depth, 1)}
                        />
                        <div className='flex items-center gap-2'>
                            <span className='text-sm text-muted-foreground whitespace-nowrap'>
                                Max. Steps:
                            </span>
                            <Select
                                value={String(depth)}
                                onValueChange={handleDepthChange}
                            >
                                <SelectTrigger className='w-16 h-8'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((d) => (
                                        <SelectItem key={d} value={String(d)}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
            />

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
                entryClassColors={entryClassColors}
            />

            <div className='grid grid-cols-1 gap-2 border rounded-md'>
                {isPending ? (
                    <div className='flex min-h-[200px] items-center justify-center'>
                        <Spinner />
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={
                                                results && results.length > 0 && selectedIds.size === results.length
                                                    ? true
                                                    : selectedIds.size > 0
                                                        ? 'indeterminate'
                                                        : false
                                            }
                                            onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results && results.length > 0 ? (
                                    results.map((result, index) => (
                                        <RelationRow
                                            key={result.id || index}
                                            srcId={obj.id!}
                                            result={result}
                                            isSelected={result.id !== undefined && selectedIds.has(result.id)}
                                            onToggleSelection={(checked) => result.id !== undefined && toggleRowSelection(result.id, checked)}
                                            isOpen={result.id !== undefined && expandedRows.has(result.id)}
                                            onToggleOpen={(open) => result.id !== undefined && toggleRowExpansion(result.id, open)}
                                            router={router}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No relations found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="py-2 border-t">
                            <Pagination
                                currentPage={page}
                                totalPages={calculatedTotalPages}
                                onPageChange={(newPage) => setPage(newPage)}
                                pageSize={pageSize}
                                onPageSizeChange={(newSize) => {
                                    setPageSize(newSize);
                                    setPage(1);
                                }}
                                selectedCount={selectedIds.size}
                                totalRows={results ? results.length : 0}
                            />
                        </div>
                    </div>
                )}
            </div>

            <ActionBar
                open={selectedIds.size > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedIds.size} relation
                    {selectedIds.size !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={copyToCSV}
                        disabled={isPending || selectedIds.size === 0}
                    >
                        <CopyIcon size={18} weight="bold" />
                        Copy to CSV
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
        </div>
    );
}
