import { createStatusFilter } from '@/utils/status-filter';

export const QUERY_SLUGS = ['working', 'warning', 'done', 'error'] as const;

export const { FILTER_OPTIONS, parseParam, toFilterValue } =
    createStatusFilter(QUERY_SLUGS);
