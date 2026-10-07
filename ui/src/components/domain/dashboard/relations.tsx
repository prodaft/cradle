import { SearchInput } from '@/components/base/search-input/search-input';
import { TableSkeleton } from '@/components/base/table-skeleton';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import {
    Stepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperList,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/custom/stepper';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useNdjsonQuery } from '@/hooks/query';
import type {
    QualifierSpec,
    SearchSchema,
    SearchState,
} from '@/lib/search-query/search-schema';
import { createDashboardLink } from '@/utils/dashboard';
import { CaretDownIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
    type Cell,
    type ColumnDef,
    type ExpandedState,
    type Row,
    type RowSelectionState,
    type VisibilityState,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type RelationEntry = components['schemas']['EntryWithDepth'] & {
    color?: string | null;
    depth?: number;
    type?: string;
};

interface RelationsProps {
    obj: {
        id?: number;
        [key: string]: any;
    };
}

function ExpandedRowContent({
    srcId,
    result,
}: {
    srcId: number;
    result: RelationEntry;
}) {
    const [stepId, setStepId] = useState<string | null>(null);

    const isExpandable = result.id !== undefined && result.id !== srcId;

    const { data: paths, isLoading } = useQuery({
        queryKey: ['graph', 'paths', { src: String(srcId), dst: result.id }],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/knowledge-graph/paths/',
                {
                    params: {
                        query: {
                            src: srcId,
                            dsts: [result.id!],
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: isExpandable,
    });

    const pathSteps = useMemo(() => {
        if (!paths) return [];

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
                            color: (paths.colors as Record<string, string>)[subtype],
                        });
                    }
                });
            });
        };

        processEntries(paths.entries.entities);
        processEntries(paths.entries.artifacts);

        const adj = new Map<number, number[]>();
        paths.relations.forEach((rel: any) => {
            if (!adj.has(rel.src)) adj.set(rel.src, []);
            if (!adj.has(rel.dst)) adj.set(rel.dst, []);
            adj.get(rel.src)!.push(rel.dst);
            adj.get(rel.dst)!.push(rel.src);
        });

        const queue: number[][] = [[srcId]];
        const visited = new Set<number>([srcId]);
        let foundPath: number[] = [];

        while (queue.length > 0) {
            const path = queue.shift()!;
            const curr = path.at(-1);
            if (curr === undefined) continue;

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
    }, [paths, srcId, result.id]);

    const activeStepId = stepId ?? pathSteps[0]?.id ?? null;
    const activeStep = pathSteps.find((s) => s.id === activeStepId) ?? null;

    return (
        <div className='bg-muted/30 border-t'>
            <div className='p-4 flex flex-col gap-6'>
                {isLoading ? (
                    <div className='flex gap-2 p-4'>
                        <Skeleton className='h-8 w-24' />
                        <Skeleton className='h-8 w-32' />
                        <Skeleton className='h-8 w-28' />
                        <Skeleton className='h-8 w-20' />
                    </div>
                ) : pathSteps.length > 0 ? (
                    <>
                        <PathStepper
                            steps={pathSteps}
                            value={activeStepId || pathSteps[0].id}
                            onStepClick={setStepId}
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
    value,
    onStepClick,
}: {
    steps: any[];
    value: string;
    onStepClick: (id: string) => void;
}) {
    return (
        <Stepper
            value={value}
            onValueChange={onStepClick}
            orientation='horizontal'
            key={value}
        >
            <StepperList>
                {steps.map((step) => (
                    <StepperItem key={step.id} value={step.id}>
                        <StepperTrigger className='p-0'>
                            <StepperIndicator />
                            <StepperTitle
                                className='max-w-[120px] truncate'
                                title={step.title}
                            >
                                {step.title}
                            </StepperTitle>
                            <StepperDescription
                                className='max-w-[120px] truncate'
                                title={step.description}
                            >
                                {step.description}
                            </StepperDescription>
                        </StepperTrigger>
                        <StepperSeparator />
                    </StepperItem>
                ))}
            </StepperList>
        </Stepper>
    );
}

const DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const;
const DEFAULT_DEPTH = 2;

const DEPTH_QUALIFIER: QualifierSpec = {
    key: 'depth',
    aliases: ['steps'],
    description: 'max. steps',
    kind: 'enum',
    values: DEPTH_OPTIONS.map((d) => ({
        value: String(d),
        label: `${d} step${d !== 1 ? 's' : ''}`,
    })),
};

export default function Relations({ obj }: RelationsProps) {
    const [appliedSearch, setAppliedSearch] = useState('');
    const [depthValue, setDepthValue] = useState<string>();
    const depth = depthValue ? Number(depthValue) : DEFAULT_DEPTH;
    const [types, setTypes] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const router = useRouter();

    const requestAccess = useMutation({
        mutationFn: async (entities: string[]) => {
            await Promise.all(
                entities.map(async (entity) => {
                    const entityId = Number(entity);
                    const { error, response } = await fetchClient.POST(
                        '/access/request/{entity_id}/',
                        {
                            params: { path: { entity_id: entityId } },
                            body: { entity_id: entityId },
                        },
                    );
                    if (error) throw { response, error };
                }),
            );
        },
        meta: {
            successMessage: 'Access request submitted successfully',
        },
    });

    const { data: entryClasses } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'relations'],
        meta: { showErrorToast: true },
    });

    const entrySubtypes = useMemo(() => {
        const results = entryClasses ?? [];
        return results.map((c: any) => c.subtype as string);
    }, [entryClasses]);

    const searchSchema = useMemo<SearchSchema>(
        () => ({
            qualifiers: [
                {
                    key: 'type',
                    aliases: ['subtype'],
                    description: 'entry type',
                    kind: 'enum',
                    multiple: true,
                    values: [...entrySubtypes]
                        .sort((a, b) => a.localeCompare(b))
                        .map((value) => ({ value })),
                },
                DEPTH_QUALIFIER,
            ],
        }),
        [entrySubtypes],
    );

    const searchState = useMemo<SearchState>(() => {
        const values: Record<string, string[]> = {};
        if (types.length > 0) values.type = types;
        if (depthValue) values.depth = [depthValue];
        return { q: appliedSearch || undefined, values, dates: {} };
    }, [appliedSearch, types, depthValue]);

    const { data: neighbors, isLoading } = useQuery({
        queryKey: [
            'graph',
            'neighbors',
            {
                src: obj.id!,
                depth,
                page,
                pageSize,
                query: appliedSearch,
                subtype: types,
            },
        ],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/knowledge-graph/neighbors/',
                {
                    params: {
                        query: {
                            src: obj.id!,
                            depth,
                            page,
                            page_size: pageSize,
                            ...(types.length > 0 ? { subtype: types } : {}),
                            ...(appliedSearch ? { search: appliedSearch } : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!obj.id,
        meta: { showErrorToast: true },
    });

    const hasNextPage = neighbors?.has_next ?? false;

    const results = useMemo(() => {
        if (!neighbors) return [];
        return neighbors.results ?? [];
    }, [neighbors]);

    const { data: inaccessibleIds = [] } = useQuery({
        queryKey: [
            'graph',
            'inaccessible',
            {
                src: obj.id!,
                depth,
            },
        ],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/knowledge-graph/inaccessible/',
                {
                    params: {
                        query: {
                            src: obj.id!,
                            depth,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!obj.id && depth > 0,
        meta: { suppressNotification: true },
        select: (response) => response?.inaccessible ?? [],
    });

    const hasInaccessible = inaccessibleIds.length > 0;

    const applySearch = useCallback((state: SearchState) => {
        setAppliedSearch(state.q ?? '');
        setTypes(state.values.type ?? []);
        setDepthValue(state.values.depth?.[0]);
        setPage(1);
    }, []);

    const totalPages = hasNextPage ? page + 1 : page;

    const columns = useMemo<ColumnDef<RelationEntry>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={
                            table.getIsSomePageRowsSelected() &&
                            !table.getIsAllPageRowsSelected()
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
                    const isExpandable = !isSameEntry && row.original.id !== undefined;
                    return isExpandable ? (
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
        data: results,
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
        pageCount: totalPages,
        enableRowSelection: true,
    });

    const selectedCount = table.getFilteredSelectedRowModel().rows.length;

    const copyToCSV = useCallback(() => {
        const selection = table.getFilteredSelectedRowModel().rows;
        if (selection.length === 0) return;

        let csvContent = '"type","name"\n';
        selection.forEach((row) => {
            const type = String(row.original.subtype).replace(/"/g, '""');
            const name = String(row.original.name).replace(/"/g, '""');
            csvContent += `"${type}","${name}"\n`;
        });

        navigator.clipboard
            .writeText(csvContent)
            .then(() => {
                toast.success(
                    `Copied ${selection.length} relation${selection.length > 1 ? 's' : ''} to clipboard`,
                );
            })
            .catch(() => {
                toast.error('Failed to copy to clipboard');
            });
    }, [table]);

    const clearSelection = useCallback(() => {
        table.toggleAllRowsSelected(false);
    }, [table]);

    const toggleRow = useCallback(
        (row: Row<RelationEntry>) => {
            const result = row.original;
            const isSameEntry = result.id !== undefined && result.id === obj.id;
            const isExpandable = !isSameEntry && result.id !== undefined;
            if (isExpandable) row.toggleExpanded();
        },
        [obj.id],
    );

    const getRowClassName = useCallback(
        (row: Row<RelationEntry>) => {
            const result = row.original;
            const isSameEntry = result.id !== undefined && result.id === obj.id;
            const isExpandable = !isSameEntry && result.id !== undefined;
            return !isExpandable ? 'opacity-70' : undefined;
        },
        [obj.id],
    );

    const getCellProps = useCallback(
        (cell: Cell<RelationEntry, unknown>) => {
            if (cell.column.id === 'select' || cell.column.id === 'expand') {
                return undefined;
            }
            const result = cell.row.original;
            const dashboardLink = createDashboardLink({
                name: result.name ?? '',
                subtype: result.subtype,
                type: result.entry_class?.type,
            });
            return {
                onClick: (e: React.MouseEvent<HTMLTableCellElement>) => {
                    e.stopPropagation();
                    router.navigate({ to: dashboardLink as any });
                },
            };
        },
        [router],
    );

    const renderSubRow = useCallback(
        (row: Row<RelationEntry>) => (
            <ExpandedRowContent srcId={obj.id!} result={row.original} />
        ),
        [obj.id],
    );

    return (
        <ScrollArea className='flex w-full flex-col gap-2.5'>
            {hasInaccessible && (
                <AlertComponent variant='default'>
                    <WarningCircleIcon size={18} weight='bold' />
                    <AlertDescription>
                        {inaccessibleIds.length} related{' '}
                        {inaccessibleIds.length === 1 ? 'entity is' : 'entities are'}{' '}
                        not accessible
                    </AlertDescription>
                    <Button
                        variant='outline'
                        size='sm'
                        className='ml-auto'
                        onClick={() =>
                            requestAccess.mutate(inaccessibleIds.map(String))
                        }
                    >
                        Request Access
                    </Button>
                </AlertComponent>
            )}

            <DataTable
                table={table}
                isLoading={isLoading}
                loadingPlaceholder={
                    <TableSkeleton showToolbar={false} rows={8} columns={5} />
                }
                showPagination={!isLoading}
                onRowClickRow={toggleRow}
                getRowClassName={getRowClassName}
                getCellProps={getCellProps}
                renderSubRow={renderSubRow}
                emptyMessage='No relations found.'
                toolbarEnd={<DataTableViewOptions table={table} align='end' />}
                actionBar={
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
                                disabled={isLoading || selectedCount === 0}
                            >
                                <CopyIcon size={18} weight='bold' />
                                Copy to CSV
                            </ActionBarItem>
                        </ActionBarGroup>
                        <ActionBarSeparator />
                        <ActionBarClose
                            className='px-2 text-sm'
                            onClick={clearSelection}
                        >
                            Clear
                        </ActionBarClose>
                    </ActionBar>
                }
            >
                <SearchInput
                    schema={searchSchema}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search relations...'
                />
            </DataTable>
            <ScrollBar orientation='horizontal' />
        </ScrollArea>
    );
}
