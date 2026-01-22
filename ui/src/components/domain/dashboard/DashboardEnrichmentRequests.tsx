import { queryKeys } from '@/hooks/query';
import useApi from '@/hooks/api/useApi';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { capitalize } from 'lodash';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusIcon, type StatusType } from '../notes/StatusIcon';
import type { EnrichmentRequestList } from '@services/cradle/models';
import { truncateText } from '@/utils/dashboard';

interface DashboardEnrichmentRequestsProps {
    entryId: number;
}

export default function DashboardEnrichmentRequests({
    entryId,
}: DashboardEnrichmentRequestsProps) {
    const { intelioApi } = useApi();
    const router = useRouter();

    const { data: requestsData, isPending } = useQuery({
        queryKey: queryKeys.enrichment.requests.list({
            entryId: entryId.toString(),
        }),
        queryFn: () =>
            intelioApi.enrichmentRequestList({
                entryId: entryId.toString(),
                orderBy: '-created_at',
            }),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch enrichment requests',
        },
    });

    const enrichmentRequests = requestsData?.results || [];

    const errorMsg = (request: EnrichmentRequestList) => {
        let msgs: string[] = [];
        if (request.ignoredCount && request.ignoredCount > 0) {
            msgs.push(
                `Ignored ${request.ignoredCount} artifact${request.ignoredCount > 1 ? 's' : ''}`,
            );
        }
        let warn_count =
            request.enrichers?.filter((enricher) => enricher.status === 'warning')
                .length || 0;
        if (warn_count > 0) {
            msgs.push(`Warnings in ${warn_count} enricher${warn_count > 1 ? 's' : ''}`);
        }
        let error_count =
            request.enrichers?.filter((enricher) => enricher.status === 'error')
                .length || 0;
        if (error_count > 0) {
            msgs.push(`Errors in ${error_count} enricher${error_count > 1 ? 's' : ''}`);
        }

        return msgs.join(', ');
    };

    const getStatusIcon = (status?: string, errorMessage?: string) => {
        if (!status) return null;

        const tooltipContent = errorMessage || capitalize(status);
        const tooltipColorClass =
            status === 'error'
                ? '[--tooltip-bg:var(--destructive)] [--tooltip-fg:var(--destructive-foreground)] whitespace-pre-line'
                : status === 'waiting'
                    ? '[--tooltip-bg:var(--chart-4)] [--tooltip-fg:var(--foreground)] whitespace-pre-line'
                    : '';

        if ((status === 'error' || status === 'waiting') && errorMessage) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className='inline-flex items-center align-middle flex-shrink-0'>
                            <StatusIcon status={status as StatusType} />
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
                        <StatusIcon status={status as StatusType} />
                    </span>
                </TooltipTrigger>
                <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
        );
    };

    const handleRequestClick = (requestId: number) => {
        router.navigate({
            to: '/enrichment/$id',
            params: { id: requestId.toString() },
        });
    };

    if (isPending) {
        return (
            <div className='flex items-center justify-center py-8'>
                <p className='text-muted-foreground'>Loading enrichment requests...</p>
            </div>
        );
    }

    if (enrichmentRequests.length === 0) {
        return (
            <div className='flex items-center justify-center py-8'>
                <p className='text-muted-foreground'>
                    No enrichment requests found for this entry.
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-2'>
            {enrichmentRequests.map((request) => (
                <div
                    key={request.id}
                    className='flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors'
                    onClick={() => request.id && handleRequestClick(request.id)}
                >
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                        <span className='inline-flex items-center flex-shrink-0'>
                            {getStatusIcon(request.status, errorMsg(request))}
                        </span>
                        <div className='flex flex-col min-w-0 flex-1'>
                            <span className='font-medium truncate'>
                                {truncateText(request.title, 80)}
                            </span>
                            <span className='text-sm text-muted-foreground'>
                                {request.userDetail?.username || 'Unknown user'}
                            </span>
                        </div>
                    </div>
                    <div className='text-sm text-muted-foreground whitespace-nowrap ml-4'>
                        {request.createdAt
                            ? format(new Date(request.createdAt), 'dd/MM/yyyy, HH:mm')
                            : 'N/A'}
                    </div>
                </div>
            ))}
        </div>
    );
}
