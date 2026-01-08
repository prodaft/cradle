import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import { Button } from '@/components/ui/button';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { useParams } from 'react-router-dom';
import { ReportList as ReportListModel } from '@/services/cradle';
import { capitalizeString, truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarButton } from '@components/base/ActionBar/ActionBar';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import StatusHeaderDropdown from '@components/base/StatusHeaderDropdown/StatusHeaderDropdown';
import TableActionsButton from '@components/base/TableActionsButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import ConfirmDeletionModal from '@components/modals/base/ConfirmDeletionModal';
import { Edit, Eye, InfoCircleSolid, PlusCircle, RefreshCircle, Trash, WarningCircleSolid, WarningTriangleSolid } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import type { SortDirection } from '@/components/base/ListView/types';

interface Column {
    key: string;
    label: string;
    className?: string;
}

interface SelectProps {
    enableMultiSelect?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

interface Action {
    value: string;
    label: string;
    handler: (selectedIds: string[]) => Promise<void>;
}

export default function ReportList() {
    const { report_id } = useParams<{ report_id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<ReportListModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(
        searchParams.get('reports_sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        (searchParams.get('reports_sort_direction') as SortDirection) || 'desc',
    );
    const { reportsApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { setModal } = useModal();
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('reports_pagesize')) || 10,
    );
    const [statusFilter, setStatusFilter] = useState('all');
    const { execute } = useAPICall();

    // Mapping of table columns to API field names
    const sortFieldMapping: Record<string, string> = {
        title: 'title',
        author: 'user__username',
        strategy: 'strategy',
        createdAt: 'created_at',
    };

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            if (sorting.length === 0) {
                setSortField('created_at');
                setSortDirection('desc');
            } else {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                setSortField(apiField);
                setSortDirection(sort.desc ? 'desc' : 'asc');
            }

            // Reset to first page when sorting changes
            setPage(1);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('reports_page', '1');
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = sortFieldMapping[sort.id] || sort.id;
                newParams.set('reports_sort_field', apiField);
                newParams.set('reports_sort_direction', sort.desc ? 'desc' : 'asc');
            }
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            if (report_id) {
                const report = await execute(() =>
                    reportsApi.reportsRetrieve({ id: report_id }),
                );
                setReports([report]);
            } else {
                const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
                const response = await reportsApi.reportsList({
                    page,
                    pageSize: pageSize,
                    orderBy,
                });

                // Client-side status filtering
                let filteredResults = response.results;
                if (statusFilter && statusFilter !== 'all') {
                    filteredResults = response.results.filter(
                        (report) => report.status === statusFilter,
                    );
                }

                setReports(filteredResults);
                setTotalPages(response.totalPages);
            }
        } catch (error) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [
        report_id,
        page,
        sortField,
        sortDirection,
        pageSize,
        statusFilter,
        execute,
        reportsApi,
    ]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    // Define actions for the ActionBar
    const actions: Action[] = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds: string[]) => {
                setModal(ConfirmDeletionModal, {
                    onConfirm: async () => {
                        try {
                            // Send all delete requests in parallel
                            const deletePromises = selectedIds.map((id) =>
                                reportsApi.reportsDestroy({ id }),
                            );
                            const results = await Promise.allSettled(deletePromises);

                            // Count successes and failures
                            const successes = results.filter(
                                (r) => r.status === 'fulfilled',
                            ).length;
                            const failures = results.filter(
                                (r) => r.status === 'rejected',
                            ).length;

                            if (failures === 0) {
                                toast.success(`Successfully deleted ${successes} report${successes > 1 ? 's' : ''}`);
                            } else if (successes === 0) {
                                toast.error(`Failed to delete ${failures} report${failures > 1 ? 's' : ''}`);
                            } else {
                                toast.info(`Deleted ${successes} report${successes > 1 ? 's' : ''}, ${failures} failed`);
                            }

                            // Refresh the reports list
                            setSelectedReports([]);
                            fetchReports();
                        } catch (error) {
                            toast.error('An unexpected error occurred while deleting reports');
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} report${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        const columnId = Object.keys(sortFieldMapping).find(
            (key) => sortFieldMapping[key] === sortField
        ) || sortField;
        
        return columnId ? [{
            id: columnId,
            desc: sortDirection === 'desc',
        }] : [];
    }, [sortField, sortDirection]);

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const icon = (() => {
            switch (status) {
                case 'done':
                    return (
                        <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                            className='text-primary'
                        >
                            <path
                                d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </svg>
                    );
                case 'working':
                    return (
                        <InfoCircleSolid
                            className='text-primary'
                            width='18'
                            height='18'
                        />
                    );
                case 'warning':
                    return (
                        <WarningTriangleSolid
                            className='text-muted-foreground'
                            width='18'
                            height='18'
                        />
                    );
                case 'error':
                    return (
                        <WarningCircleSolid
                            className='text-destructive'
                            width='18'
                            height='18'
                        />
                    );
                default:
                    return null;
            }
        })();

        const tooltipContent = errorMessage || capitalizeString(status);
        const tooltipColorClass = status === 'error' ? 'bg-destructive text-destructive-foreground' : status === 'warning' ? 'bg-accent text-accent-foreground' : '';

        if ((status === 'error' || status === 'warning') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            {icon}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className={tooltipColorClass}>
                        {tooltipContent}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className='inline-flex items-center align-middle flex-shrink-0'>
                        {icon}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        );
    };


    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<ReportListModel>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <div className='w-20'>
                        <div className='flex items-center'>
                            {getStatusIcon(row.original.status, row.original.errorMessage || undefined)}
                        </div>
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Title" />
                ),
                cell: ({ row }) => (
                    <div className='truncate max-w-xs font-medium' title={row.original.title}>
                        {row.original.title}
                    </div>
                ),
            },
            {
                accessorKey: 'strategy',
                id: 'strategy',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Strategy" />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-24' title={row.original?.strategyLabel}>
                        {truncateText(row.original?.strategyLabel, 24)}
                    </div>
                ),
            },
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Created At" />
                ),
                cell: ({ row }) => (
                    <div className='w-36'>{formatDate(new Date(row.original.createdAt || ''))}</div>
                ),
            },
            {
                accessorKey: 'anonymized',
                id: 'anonymized',
                header: 'Anonymized',
                cell: ({ row }) => (
                    <div className='w-24'>{row.original?.anonymized ? 'Yes' : 'No'}</div>
                ),
                enableSorting: false,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const report = row.original;
                    const handleView = async () => {
                        let details = await execute(() => reportsApi.reportsRetrieve({ id: report.id!, downloadUrl: false }));
                        if (details.reportUrl) {
                            window.open(details.reportUrl, '_blank');
                        } else {
                            toast.error('No report location available');
                        }
                    };

                    const handleEdit = () => {
                        navigate(`/publish?report=${report.id}`);
                    };

                    const handleRetry = async () => {
                        try {
                            await reportsApi.reportsRetryCreate({
                                id: report.id!,
                            });
                            fetchReports();
                            toast.success('Retrying to build report!');
                        } catch (error) {
                            console.error('Retry report failed:', error);
                            toast.error('Failed to retry report');
                        }
                    };

                    const handleDelete = () => {
                        setModal(ConfirmDeletionModal, {
                            text: `Are you sure you want to delete this report?`,
                            onConfirm: async () => {
                                try {
                                    await reportsApi.reportsDestroy({
                                        id: report.id!,
                                    });
                                    fetchReports();
                                    toast.success('Report deleted successfully');
                                } catch (error) {
                                    console.error('Delete report failed:', error);
                                    toast.error('Failed to delete report');
                                }
                            },
                        });
                    };

                    return (
                        <div className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    {report.status === 'done' && (
                                        <DropdownMenuItem onClick={handleView}>
                                            <Eye width='18' height='18' />
                                            View Report
                                        </DropdownMenuItem>
                                    )}
                                    {report.status !== 'working' && (
                                        <DropdownMenuItem onClick={handleEdit}>
                                            <Edit width='18' height='18' />
                                            Edit Report
                                        </DropdownMenuItem>
                                    )}
                                    {report.status === 'error' && (
                                        <DropdownMenuItem onClick={handleRetry}>
                                            <RefreshCircle width='18' height='18' />
                                            Retry
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} variant="destructive">
                                        <Trash width='18' height='18' />
                                        Delete
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [handleStatusChange, statusFilter, getStatusIcon, execute, reportsApi, fetchReports, navigate, setModal],
    );

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedReports(selectedIds);
    }, []);

    return (
        <div className='w-full h-full flex flex-col space-y-3'>
            <h1 className='text-3xl font-semibold mb-4'>
                {report_id ? (
                    'Report Details'
                ) : (
                    <div className='flex items-center'>
                        Reports
                        <Button
                            variant='ghost'
                            size='icon'
                            className='justify-center ml-2 text-primary hover:bg-muted hover:text-foreground'
                            onClick={navigateLink('/publish')}
                        >
                            <PlusCircle width={24} height={24} />
                        </Button>
                    </div>
                )}
            </h1>

            {!report_id ? (
                <>
                    {!loading && (
                        <ActionBar
                            left={
                                <ActionBarButton
                                    tooltip='Create new report'
                                    variant='circle'
                                    icon={<PlusCircle width={18} height={18} />}
                                    iconActive={true}
                                    onClick={() => navigate('/publish')}
                                />
                            }
                            right={
                                <>
                                    <StatusHeaderDropdown
                                        onStatusChange={handleStatusChange}
                                        status={statusFilter}
                                        statusOptions={['all', 'done', 'working', 'error']}
                                    />
                                </>
                            }
                        />
                    )}

                    <DataTable
                        columns={columns}
                        data={reports}
                        loading={loading}
                        emptyMessage='No reports found.'
                        enableRowSelection={true}
                        selectedRows={selectedReports}
                        onRowSelectionChange={handleRowSelectionChange}
                        sorting={sorting}
                        onSortingChange={handleSortingChange}
                        manualPagination={true}
                        manualSorting={true}
                        bulkActions={[
                            {
                                id: 'delete',
                                label: 'Delete reports',
                                icon: <Trash width={18} height={18} />,
                                onClick: () => {
                                    if (selectedReports.length > 0) {
                                        actions[0].handler(selectedReports);
                                    }
                                },
                                disabled: selectedReports.length === 0 || reports.length === 0,
                                variant: 'destructive',
                            },
                        ]}
                        itemLabel="report"
                    />

                    <PaginationWrapper
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('reports_page', '1');
                            newParams.set('reports_pagesize', String(newSize));
                            setSearchParams(newParams, { replace: true });
                        }}
                        disabled={reports.length === 0}
                        selectedCount={selectedReports.length}
                        totalRows={reports.length}
                    />
                </>
            ) : loading ? (
                <p className='text-muted-foreground'>Loading reports...</p>
            ) : reports.length > 0 ? (
                <div className='text-muted-foreground'>
                    {/* Individual report view - ReportCard component not yet converted */}
                    <p>Report details view not yet implemented</p>
                </div>
            ) : (
                <p className='text-muted-foreground'>No reports found.</p>
            )}
        </div>
    );
}
