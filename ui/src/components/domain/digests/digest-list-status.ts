import { createStatusFilter } from '@/utils/status-filter';

export const QUERY_SLUGS = ['working', 'warning', 'done', 'error'] as const;

export const { parseParam } = createStatusFilter(QUERY_SLUGS);
