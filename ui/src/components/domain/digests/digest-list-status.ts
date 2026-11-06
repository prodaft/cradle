import { createStatusFilter } from '@/utils/status-filter';
import { digestStatusEnumValues } from '@services/openapi/schema';

export const { parseParam } = createStatusFilter(digestStatusEnumValues);
