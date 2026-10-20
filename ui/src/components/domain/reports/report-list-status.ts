import { createStatusFilter } from '@/utils/status-filter';
import { reportStatusEnumValues } from '@services/openapi/schema';

export const { parseParam } = createStatusFilter(reportStatusEnumValues);
