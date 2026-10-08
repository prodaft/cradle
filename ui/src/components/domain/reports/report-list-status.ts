import { createStatusFilter } from '@/utils/status-filter';

/** Allowed `status` query values for GET `/reports/`. */
export const QUERY_SLUGS = ['working', 'done', 'error'] as const;

export const { parseParam } = createStatusFilter(QUERY_SLUGS);
