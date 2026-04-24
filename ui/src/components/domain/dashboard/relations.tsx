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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNdjsonQuery } from '@/hooks/query';
import { cn } from '@/lib/utils';
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
import { Check, CirclePlus, PlusCircle, XCircle } from 'lucide-react';
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

// Expanded row detail — fetches path data and renders stepper
function ExpandedRowContent({
    srcId,
    result,
}: {
    srcId: number;
    result: RelationEntry;
}) {
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const canExpand = result.id !== undefined && result.id !== srcId;

    const { data: pathData, isLoading } = useQuery({
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
                            color: (pathData.colors as Record<string, string>)[subtype],
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

    const activeStepId = selectedStepId ?? pathSteps[0]?.id ?? null;
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
                            activeStepId={activeStepId || pathSteps[0].id}
                            onStepClick={setSelectedStepId}
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
    return (
        <Stepper
            value={activeStepId}
            onValueChange={onStepClick}
            orientation='horizontal'
            key={activeStepId}
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

function SubtypeFilter({
    options,
    selected,
    onSelectedChange,
    colorMap,
}: {
    options: string[];
    selected: string[];
    onSelectedChange: React.Dispatch<React.SetStateAction<string[]>>;
    colorMap: Map<string, string>;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const sorted = useMemo(
        () => [...options].sort((a, b) => a.localeCompare(b)),
        [options],
    );

    const toggle = (value: string) => {
        onSelectedChange((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
        );
    };

    const clear = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        onSelectedChange([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                >
                    {selected.length > 0 ? (
                        <div
                            role='button'
                            aria-label='Clear type filter'
                            tabIndex={0}
                            className='rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                            onClick={clear}
                        >
                            <XCircle />
                        </div>
                    ) : (
                        <PlusCircle />
                    )}
                    Type
                    {selected.length > 0 && (
                        <>
                            <Separator
                                orientation='vertical'
                                className='mx-0.5 data-[orientation=vertical]:h-4'
                            />
                            <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal lg:hidden'
                            >
                                {selected.length}
                            </Badge>
                            <div className='hidden items-center gap-1 lg:flex'>
                                {selected.length > 2 ? (
                                    <Badge
                                        variant='secondary'
                                        className='rounded-sm px-1 font-normal'
                                    >
                                        {selected.length} selected
                                    </Badge>
                                ) : (
                                    selected.map((s) => (
                                        <Badge
                                            key={s}
                                            variant='secondary'
                                            className='rounded-sm px-1 font-normal'
                                        >
                                            {s}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-50 p-0' align='start'>
                <Command>
                    <CommandInput placeholder='Search types...' />
                    <CommandList className='max-h-full'>
                        <CommandEmpty>No types found.</CommandEmpty>
                        <ScrollArea className='max-h-[300px]'>
                            <CommandGroup className='scroll-py-1'>
                                {sorted.map((subtype) => {
                                    const isSelected = selectedSet.has(subtype);
                                    const color = colorMap.get(subtype);
                                    return (
                                        <CommandItem
                                            key={subtype}
                                            value={subtype}
                                            onSelect={() => toggle(subtype)}
                                        >
                                            <div
                                                className={cn(
                                                    'flex size-4 items-center justify-center rounded-sm border border-primary',
                                                    isSelected
                                                        ? 'bg-primary'
                                                        : 'opacity-50 [&_svg]:invisible',
                                                )}
                                            >
                                                <Check />
                                            </div>
                                            {color && (
                                                <span
                                                    className='size-2 rounded-full shrink-0'
                                                    style={{ backgroundColor: color }}
                                                />
                                            )}
                                            <span className='truncate'>{subtype}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </ScrollArea>
                        {selected.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => clear()}
                                        className='justify-center text-center'
                                    >
                                        Clear filters
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const;

function MaxStepsFilter({
    value,
    onChange,
}: {
    value: number;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const handleSelect = (depth: (typeof DEPTH_OPTIONS)[number]) => {
        onChange(String(depth));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed font-normal'
                    aria-label={`Max steps, currently ${value}`}
                >
                    <CirclePlus />
                    Max. steps
                    <Separator
                        orientation='vertical'
                        className='mx-0.5 data-[orientation=vertical]:h-4'
                    />
                    <Badge variant='secondary' className='rounded-sm px-1 font-normal'>
                        {value}
                    </Badge>
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-44 p-0' align='start'>
                <Command>
                    <CommandList className='max-h-full'>
                        <CommandEmpty>No steps.</CommandEmpty>
                        <CommandGroup>
                            {DEPTH_OPTIONS.map((d) => {
                                const isSelected = value === d;
                                return (
                                    <CommandItem
                                        key={d}
                                        onSelect={() => handleSelect(d)}
                                    >
                                        <div
                                            className={cn(
                                                'flex size-4 items-center justify-center rounded-sm border border-primary',
                                                isSelected
                                                    ? 'bg-primary'
                                                    : 'opacity-50 [&_svg]:invisible',
                                            )}
                                        >
                                            <Check className='size-3 text-primary-foreground' />
                                        </div>
                                        <span>
                                            {d} step{d !== 1 ? 's' : ''}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function Relations({ obj }: RelationsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [depth, setDepth] = useState(2);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // TanStack Table state
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const router = useRouter();

    const requestAccessMutation = useMutation({
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

    const { data: entrySubtypesData } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        queryKey: ['entry_classes', 'relations'],
        meta: { showErrorToast: true },
    });

    const entrySubtypes = useMemo(() => {
        const results = entrySubtypesData ?? [];
        return results.map((c: any) => c.subtype);
    }, [entrySubtypesData]);

    const entryClassColors = useMemo(() => {
        const colors = new Map<string, string>();
        const results = entrySubtypesData ?? [];
        results.forEach((c: any) => {
            if (c.color) colors.set(c.subtype, c.color);
        });
        return colors;
    }, [entrySubtypesData]);

    const { data: relationsData, isLoading } = useQuery({
        queryKey: [
            'graph',
            'neighbors',
            {
                src: obj.id!,
                depth,
                page,
                pageSize,
                query: searchQuery,
                subtype: entrySubtypeFilters,
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
                            name: searchQuery ? [searchQuery] : undefined,
                            subtype:
                                entrySubtypeFilters.length > 0
                                    ? entrySubtypeFilters
                                    : undefined,
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

    const hasNextPage = relationsData?.has_next ?? false;

    const results = useMemo(() => {
        if (!relationsData) return [];
        return relationsData.results ?? [];
    }, [relationsData]);

    const { data: inaccessibleData } = useQuery({
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
    });

    const inaccessibleEntities = inaccessibleData?.inaccessible ?? [];
    const hasInaccessible = inaccessibleEntities.length > 0;

    const handleDepthChange = (value: string) => {
        setDepth(parseInt(value, 10));
        setPage(1);
    };

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    // Column definitions
    const columns = useMemo<ColumnDef<RelationEntry>[]>(
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

    const onRowClickRow = useCallback(
        (row: Row<RelationEntry>) => {
            const result = row.original;
            const isSameEntry = result.id !== undefined && result.id === obj.id;
            const canExpand = !isSameEntry && result.id !== undefined;
            if (canExpand) row.toggleExpanded();
        },
        [obj.id],
    );

    const getRowClassName = useCallback(
        (row: Row<RelationEntry>) => {
            const result = row.original;
            const isSameEntry = result.id !== undefined && result.id === obj.id;
            const canExpand = !isSameEntry && result.id !== undefined;
            return !canExpand ? 'opacity-70' : undefined;
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
                        {inaccessibleEntities.length} related{' '}
                        {inaccessibleEntities.length === 1
                            ? 'entity is'
                            : 'entities are'}{' '}
                        not accessible
                    </AlertDescription>
                    <Button
                        variant='outline'
                        size='sm'
                        className='ml-auto'
                        onClick={() =>
                            requestAccessMutation.mutate(
                                inaccessibleEntities.map(String),
                            )
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
                onRowClickRow={onRowClickRow}
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
                <Input
                    placeholder='Search relations...'
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className='h-8 w-40 lg:w-56'
                />
                <SubtypeFilter
                    options={entrySubtypes}
                    selected={entrySubtypeFilters}
                    onSelectedChange={setEntrySubtypeFilters}
                    colorMap={entryClassColors}
                />
                <MaxStepsFilter value={depth} onChange={handleDepthChange} />
            </DataTable>
            <ScrollBar orientation='horizontal' />
        </ScrollArea>
    );
}
