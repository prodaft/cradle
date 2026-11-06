import { accessTypeEnumValues } from '@services/openapi/schema';

const ACCESS_LABELS = {
    none: 'None',
    read: 'Read',
    'read-write': 'Read-Write',
} satisfies Record<(typeof accessTypeEnumValues)[number], string>;

export const ACCESS_OPTIONS = accessTypeEnumValues.map((value) => ({
    value,
    label: ACCESS_LABELS[value],
}));
