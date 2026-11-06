import { createStatusFilter } from '@/utils/status-filter';
import { enrichmentStatusEnumValues } from '@services/openapi/schema';

export const { parseParam } = createStatusFilter(enrichmentStatusEnumValues);
