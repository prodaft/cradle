import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import Pagination from '@/components/base/Pagination/Pagination';
import useApi from '@/hooks/api/useApi';
import { handleAPIError, parseAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import {
    ActionBar as BaseActionBar,
    ActionBarSearch,
} from '@components/base/ActionBar/ActionBar';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { CopyIcon, WarningCircleIcon, CaretDownIcon } from '@phosphor-icons/react';
import {
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { toast } from 'sonner';
import { defineStepper } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';

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
                            color: entry.color,
                        });
                    }
                });
            });
        };

        processEntries(pathData.entries.entities);
        processEntries(pathData.entries.artifacts);

        return Array.from(nodes.values()).map(node => ({
            id: String(node.id),
            title: node.name,
            description: node.subtype,
            entryId: node.id,
            color: node.color,
            subtype: node.subtype
        }));
    }, [pathData]);

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
                             <span className='truncate block max-w-[300px]'>
                                {result.name}
                            </span>
                        </TableCell>
                        <TableCell>
                             <div className='flex items-center gap-2'>
                                {canExpand && (
                                     <>
                                        <CaretDownIcon
                                            className={`size-4 text-muted-foreground transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`}
                                        />
                                    </>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                     <TableRow>
                        <TableCell colSpan={4} className="p-0 border-b-0">
                            <div className="bg-muted/30 border-t">
                                <div className="p-4">
                                     {isPathPending ? (
                                        <div className="flex justify-center p-4">
                                            <Spinner />
                                        </div>
                                    ) : pathSteps.length > 0 ? (
                                        <PathStepper steps={pathSteps} router={router} />
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

function PathStepper({ steps, router }: { steps: any[], router: any }) {
    const { Stepper } = useMemo(() => defineStepper(...(steps as any)), [steps]);

    return (
        <Stepper.Provider>
            <Stepper.Navigation>
                {steps.map(step => (
                    <Stepper.Step 
                        key={step.id} 
                        of={step.id} 
                        onClick={() => {
                            const link = createDashboardLink({ id: step.entryId, subtype: step.subtype });
                            router.navigate({ to: link as any });
                        }}
                    >
                        <Stepper.Title>{step.title}</Stepper.Title>
                        <Stepper.Description>{step.description}</Stepper.Description>
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
                                Depth:
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