import { createStatusFilter } from '@/utils/status-filter';

export const QUERY_SLUGS = ['waiting', 'working', 'warning', 'done', 'error'] as const;

export const { FILTER_OPTIONS, parseParam, toFilterValue } =
    createStatusFilter(QUERY_SLUGS);
