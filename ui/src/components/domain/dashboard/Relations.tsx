import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
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
import { Input } from '@/components/ui/input';
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
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { CaretDownIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
    type ColumnDef,
    type ExpandedState,
    type RowSelectionState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import React, { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
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

// Expanded row detail — fetches path data and renders stepper
function ExpandedRowContent({ srcId, result }: { srcId: number; result: Result }) {
    const { knowledgeGraphApi } = useApi();
    const router = useRouter();
    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    const isSameEntry = result.id !== undefined && result.id === srcId;
    const canExpand = !isSameEntry && result.id !== undefined;

    const { data: pathData, isPending: isPathPending } = useQuery({
        queryKey: ['graph', 'paths', { src: String(srcId), dst: result.id }],
        queryFn: () =>
            knowledgeGraphApi.knowledgeGraphPathsRetrieve({
                src: String(srcId),
                dsts: [result.id!],
            }),
        enabled: canExpand,
    });

    const pathSteps = useMemo(() => {
        if (!pathData) return [];

        const nodes = new Map<
            number,
            { id: number; name: string; subtype: string; color?: string }
        >();

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

        const adj = new Map<number, number[]>();
        pathData.relations.forEach((rel: any) => {
            if (!adj.has(rel.src)) adj.set(rel.src, []);
            if (!adj.has(rel.dst)) adj.set(rel.dst, []);
            adj.get(rel.src)!.push(rel.dst);
            adj.get(rel.dst)!.push(rel.src);
        });

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
            return Array.from(nodes.values()).map((node) => ({
                id: String(node.id),
                title: node.name,
                description: node.subtype,
                entryId: node.id,
                color: node.color,
                subtype: node.subtype,
            }));
        }

        return foundPath
            .map((id) => {
                const node = nodes.get(id);
                if (!node) return null;
                return {
                    id: String(node.id),
                    title: node.name,
                    description: node.subtype,
                    entryId: node.id,
                    color: node.color,
                    subtype: node.subtype,
                };
            })
            .filter(Boolean) as any[];
    }, [pathData, srcId, result.id]);

    useEffect(() => {
        if (pathSteps.length > 0 && !activeStepId) {
            setActiveStepId(pathSteps[0].id);
        }
    }, [pathSteps, activeStepId]);

    const activeStep = useMemo(
        () =>
            pathSteps.find((s) => s.id === activeStepId) ||
            (pathSteps.length > 0 ? pathSteps[0] : null),
        [pathSteps, activeStepId],
    );

    return (
        <div className='bg-muted/30 border-t'>
            <div className='p-4 flex flex-col gap-6'>
                {isPathPending ? (
                    <div className='flex justify-center p-4'>
                        <Spinner className='size-10' />
                    </div>
                ) : pathSteps.length > 0 ? (
                    <>
                        <PathStepper
                            steps={pathSteps}
                            activeStepId={activeStepId || pathSteps[0].id}
                            onStepClick={setActiveStepId}
                        />
                        {activeStep && (
                            <div className='pt-4 border-t flex flex-col gap-2'>
                                <div className='flex items-center gap-2'>
                                    <Badge
                                        variant='secondary'
                                        className='text-[10px] px-1.5 py-0 h-4'
                                        style={{
                                            backgroundColor: activeStep.color
                                                ? activeStep.color
                                                : undefined,
                                        }}
                                    >
                                        {activeStep.subtype}
                                    </Badge>
                                    <span className='text-sm font-semibold'>
                                        {activeStep.title}
                                    </span>
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                    ID: {activeStep.entryId}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className='text-sm text-muted-foreground text-center p-4'>
                        No path found or error loading path.
                    </div>
                )}
            </div>
        </div>
    );
}

function PathStepper({
    steps,
    activeStepId,
    onStepClick,
}: {
    steps: any[];
    activeStepId: string;
    onStepClick: (id: string) => void;
}) {
    const { Stepper } = useMemo(() => defineStepper(...(steps as any)), [steps]);

    return (
        <Stepper.Provider
            variant='horizontal'
            labelOrientation='vertical'
            initialStep={activeStepId}
            key={activeStepId}
        >
            <Stepper.Navigation>
                {steps.map((step) => (
                    <Stepper.Step
                        key={step.id}
                        of={step.id}
                        onClick={() => onStepClick(step.id)}
                        className='p-0'
                    >
                        <Stepper.Title
                            className='max-w-[120px] truncate'
                            title={step.title}
                        >
                            {truncate(step.title, 128)}
                        </Stepper.Title>
                        <Stepper.Description
                            className='max-w-[120px] truncate'
                            title={step.description}
                        >
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
    const [pageSize, setPageSize] = useState(10);

    // TanStack Table state
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const { entriesApi, knowledgeGraphApi, accessApi } = useApi();
    const router = useRouter();

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

    // Query for entry subtypes
    const { data: entrySubtypesData } = useQuery({
        queryKey: ['entrySubtypes'],
        queryFn: () => entriesApi.entryClassesList(),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load entry subtypes',
        },
    });

    const entrySubtypes = useMemo(() => {
        const results = entrySubtypesData?.results ?? [];
        return results.map((c: any) => c.subtype);
    }, [entrySubtypesData?.results]);

    const entryClassColors = useMemo(() => {
        const colors = new Map<string, string>();
        const results = entrySubtypesData?.results ?? [];
        results.forEach((c: any) => {
            if (c.color) colors.set(c.subtype, c.color);
        });
        return colors;
    }, [entrySubtypesData?.results]);

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

    // Trigger search when page changes
    useEffect(() => {
        performSearch(depth, page);
    }, [page, depth, pageSize, performSearch]);

    // Reset to page 1 when pageSize changes
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    // Column definitions
    const columns = useMemo<ColumnDef<Result>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(checked) =>
                            table.toggleAllPageRowsSelected(!!checked)
                        }
                        aria-label='Select all'
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label='Select row'
                    />
                ),
                size: 50,
                enableHiding: false,
                enableSorting: false,
            },
            {
                accessorKey: 'subtype',
                id: 'type',
                header: 'Type',
                meta: { label: 'Type' },
                cell: ({ row }) => (
                    <Badge
                        className={`rounded-full ${!row.original.color ? 'bg-muted' : ''}`}
                        style={
                            row.original.color
                                ? { backgroundColor: row.original.color }
                                : undefined
                        }
                    >
                        {row.original.subtype}
                    </Badge>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'name',
                id: 'name',
                header: 'Name',
                meta: { label: 'Name' },
                cell: ({ row }) => (
                    <span className='truncate block max-w-[300px]'>
                        {row.original.name}
                    </span>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'depth',
                id: 'steps',
                header: 'Steps',
                meta: { label: 'Steps' },
                size: 80,
                cell: ({ row }) => (
                    <span className='text-muted-foreground text-xs whitespace-nowrap'>
                        {row.original.depth} step
                        {row.original.depth !== 1 ? 's' : ''}
                    </span>
                ),
                enableSorting: false,
            },
            {
                id: 'expand',
                header: '',
                size: 50,
                enableHiding: false,
                enableSorting: false,
                cell: ({ row }) => {
                    const isSameEntry =
                        row.original.id !== undefined && row.original.id === obj.id;
                    const canExpand = !isSameEntry && row.original.id !== undefined;
                    return canExpand ? (
                        <div className='flex items-center justify-end'>
                            <CaretDownIcon
                                className={`size-4 text-muted-foreground transition-transform ${row.getIsExpanded() ? 'rotate-180' : ''}`}
                            />
                        </div>
                    ) : null;
                },
            },
        ],
        [obj.id],
    );

    const table = useReactTable({
        data: results ?? [],
        columns,
        state: {
            rowSelection,
            columnVisibility,
            expanded,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) =>
            row.id !== undefined ? String(row.id) : String(index),
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
        onExpandedChange: setExpanded,
        onPaginationChange: (updater) => {
            const current = { pageIndex: page - 1, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (next.pageSize !== pageSize) {
                setPageSize(next.pageSize);
                setPage(1);
            } else if (next.pageIndex + 1 !== page) {
                setPage(next.pageIndex + 1);
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        manualPagination: true,
        pageCount: calculatedTotalPages,
        enableRowSelection: true,
    });

    const selectedCount = table.getFilteredSelectedRowModel().rows.length;

    const copyToCSV = useCallback(() => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        if (selectedRows.length === 0) return;

        let csvContent = '"type","name"\n';
        selectedRows.forEach((row) => {
            const type = String(row.original.subtype).replace(/"/g, '""');
            const name = String(row.original.name).replace(/"/g, '""');
            csvContent += `"${type}","${name}"\n`;
        });

        navigator.clipboard
            .writeText(csvContent)
            .then(() => {
                toast.success(
                    `Copied ${selectedRows.length} relation${selectedRows.length > 1 ? 's' : ''} to clipboard`,
                );
            })
            .catch(() => {
                toast.error('Failed to copy to clipboard');
            });
    }, [table]);

    const clearSelection = useCallback(() => {
        table.toggleAllRowsSelected(false);
    }, [table]);

    return (
        <div className='flex w-full flex-col gap-2.5 overflow-auto'>
            {alert.show && (
                <AlertComponent
                    variant={
                        alert.color === 'red' || alert.color === 'error'
                            ? 'destructive'
                            : 'default'
                    }
                >
                    <WarningCircleIcon size={18} weight='bold' />
                    <AlertDescription>{alert.message}</AlertDescription>
                    {alert.button && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='ml-auto'
                            onClick={alert.button.onClick}
                        >
                            {alert.button.text}
                        </Button>
                    )}
                </AlertComponent>
            )}

            <div
                role='toolbar'
                aria-orientation='horizontal'
                className='flex w-full items-start justify-between gap-2 py-1'
            >
                <div className='flex flex-1 flex-wrap items-center gap-2'>
                    <Input
                        placeholder='Search relations...'
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            performSearch(depth, 1);
                        }}
                        className='h-8 w-40 lg:w-56'
                    />
                    <SearchFilterSection
                        entrySubtypes={entrySubtypes}
                        entrySubtypeFilters={entrySubtypeFilters}
                        setEntrySubtypeFilters={setEntrySubtypeFilters}
                        entryClassColors={entryClassColors}
                    />
                    <div className='flex items-center gap-2'>
                        <span className='text-sm text-muted-foreground whitespace-nowrap'>
                            Max. Steps:
                        </span>
                        <Select value={String(depth)} onValueChange={handleDepthChange}>
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
                <div className='flex items-center gap-2'>
                    <DataTableViewOptions table={table} align='end' />
                </div>
            </div>

            {isPending ? (
                <div className='flex min-h-[200px] items-center justify-center'>
                    <Spinner className='size-10' />
                </div>
            ) : (
                <>
                    <div className='overflow-hidden rounded-md border'>
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                colSpan={header.colSpan}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef
                                                              .header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => {
                                        const result = row.original;
                                        const isSameEntry =
                                            result.id !== undefined &&
                                            result.id === obj.id;
                                        const canExpand =
                                            !isSameEntry && result.id !== undefined;
                                        const dashboardLink =
                                            createDashboardLink(result);

                                        const handleNavigate = (e: MouseEvent) => {
                                            e.stopPropagation();
                                            router.navigate({
                                                to: dashboardLink as any,
                                            });
                                        };

                                        return (
                                            <React.Fragment key={row.id}>
                                                <TableRow
                                                    data-state={
                                                        row.getIsSelected() &&
                                                        'selected'
                                                    }
                                                    className={`cursor-pointer hover:bg-muted/50 ${!canExpand ? 'opacity-70' : ''}`}
                                                    onClick={() =>
                                                        canExpand &&
                                                        row.toggleExpanded()
                                                    }
                                                >
                                                    {row
                                                        .getVisibleCells()
                                                        .map((cell) => (
                                                            <TableCell
                                                                key={cell.id}
                                                                onClick={
                                                                    cell.column.id !==
                                                                        'select' &&
                                                                    cell.column.id !==
                                                                        'expand'
                                                                        ? handleNavigate
                                                                        : undefined
                                                                }
                                                            >
                                                                {flexRender(
                                                                    cell.column
                                                                        .columnDef.cell,
                                                                    cell.getContext(),
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                </TableRow>
                                                {row.getIsExpanded() && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={
                                                                row.getVisibleCells()
                                                                    .length
                                                            }
                                                            className='p-0 border-b-0'
                                                        >
                                                            <ExpandedRowContent
                                                                srcId={obj.id!}
                                                                result={result}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={table.getAllColumns().length}
                                            className='h-24 text-center'
                                        >
                                            No relations found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className='flex flex-col gap-2.5'>
                        <DataTablePagination table={table} />
                    </div>
                </>
            )}

            <ActionBar
                open={selectedCount > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedCount} relation
                    {selectedCount !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={copyToCSV}
                        disabled={isPending || selectedCount === 0}
                    >
                        <CopyIcon size={18} weight='bold' />
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
