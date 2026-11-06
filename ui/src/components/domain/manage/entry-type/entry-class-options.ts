import {
    entryTypeEnumValues,
    entryTypeFormatEnumValues,
} from '@services/openapi/schema';

const TYPE_LABELS = {
    artifact: 'Artifact',
    entity: 'Entity',
} satisfies Record<(typeof entryTypeEnumValues)[number], string>;

const FORMAT_LABELS = {
    options: 'Enumerator',
    regex: 'Regex',
} satisfies Record<(typeof entryTypeFormatEnumValues)[number], string>;

export const typeOptions = (
    Object.keys(TYPE_LABELS) as (typeof entryTypeEnumValues)[number][]
).map((value) => ({
    value,
    label: TYPE_LABELS[value],
}));

export function entryClassFormat(
    value: string | null | undefined,
): (typeof entryTypeFormatEnumValues)[number] | null {
    return entryTypeFormatEnumValues.find((item) => item === value) ?? null;
}

export const formatOptions = [
    { value: 'any' as const, label: 'Any Format' },
    ...(Object.keys(FORMAT_LABELS) as (typeof entryTypeFormatEnumValues)[number][]).map(
        (value) => ({
            value,
            label: FORMAT_LABELS[value],
        }),
    ),
];
