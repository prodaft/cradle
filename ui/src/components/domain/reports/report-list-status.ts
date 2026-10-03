import { createStatusFilter } from '@/utils/status-filter';

/** Allowed `status` query values for GET `/reports/`. */
export const QUERY_SLUGS = ['working', 'done', 'error'] as const;

export const { FILTER_OPTIONS, parseParam, toFilterValue } =
    createStatusFilter(QUERY_SLUGS);
