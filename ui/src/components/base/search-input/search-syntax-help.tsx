import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    quoteIfNeeded,
    type QualifierSpec,
    type SearchSchema,
} from '@/lib/search-query/search-schema';
import { QuestionIcon } from '@phosphor-icons/react';

interface HelpRow {
    syntax: string;
    description: string;
}

const CONTENT_ROWS: HelpRow[] = [
    { syntax: 'admin', description: 'contains text' },
    { syntax: '"admin ci"', description: 'contains phrase' },
    { syntax: '=admin', description: 'exact whole field' },
    { syntax: '="admin ci"', description: 'exact whole field (multi-word)' },
    { syntax: 'admin*', description: 'starts with' },
    { syntax: '*admin', description: 'ends with' },
    { syntax: 'adm*n', description: 'whole-field pattern' },
];

const OPERATOR_ROWS: HelpRow[] = [
    { syntax: 'apt29 cozy', description: 'and (implicit)' },
    { syntax: 'apt29 OR cozy', description: 'or' },
    { syntax: 'apt29 NOT bear', description: 'not' },
    { syntax: 'apt29 -bear', description: 'not (shorthand)' },
    { syntax: '(a OR b) AND c', description: 'group' },
];

function qualifierRows(spec: QualifierSpec): HelpRow[] {
    if (spec.kind === 'date') {
        return [
            {
                syntax: `${spec.key}:2024-01-01`,
                description: `${spec.description} on day`,
            },
            {
                syntax: `${spec.key}:>2024-01-01`,
                description: `${spec.description} on or after`,
            },
            {
                syntax: `${spec.key}:<2024-01-01`,
                description: `${spec.description} on or before`,
            },
            {
                syntax: `${spec.key}:2024-01-01..2024-02-01`,
                description: `${spec.description} in range`,
            },
        ];
    }
    if (spec.kind === 'enum' && spec.values.length === 0) return [];
    const example =
        (spec.kind === 'text' ? spec.example : undefined) ??
        spec.values?.[0]?.value ??
        'value';
    const rows = [
        {
            syntax: `${spec.key}:${quoteIfNeeded(example)}`,
            description: spec.description,
        },
    ];
    if (spec.kind === 'enum') {
        rows.push({
            syntax: spec.values.map((v) => v.value).join(' | '),
            description: spec.multiple
                ? `${spec.key} values (repeat the key for any of)`
                : `${spec.key} values`,
        });
    }
    return rows;
}

export function SearchSyntaxHelp({ schema }: { schema: SearchSchema }) {
    const filterRows = (schema.qualifiers ?? []).flatMap(qualifierRows);
    const sortFields = schema.sortFields ?? [];
    if (sortFields.length > 0) {
        const example = sortFields[0]!.value;
        filterRows.push(
            { syntax: `sort:${example}`, description: 'sort ascending' },
            { syntax: `sort:-${example}`, description: 'sort descending' },
            {
                syntax: sortFields.map((f) => f.value).join(' | '),
                description: 'sortable fields',
            },
        );
    }
    const firstQualifier = filterRows[0]?.syntax;
    if (firstQualifier) {
        filterRows.push({
            syntax: `(a OR b) ${firstQualifier}`,
            description: 'filters apply to all text; group OR in parentheses',
        });
    }
    const sections = [
        { title: 'Text', rows: CONTENT_ROWS },
        { title: 'Operators', rows: OPERATOR_ROWS },
        { title: 'Filters', rows: filterRows },
    ].filter((section) => section.rows.length > 0);

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        aria-label='Search syntax help'
                        className='text-muted-foreground'
                    />
                }
            >
                <QuestionIcon />
            </PopoverTrigger>
            <PopoverContent align='end' className='w-80 max-h-[70vh] overflow-y-auto'>
                <p className='text-sm font-medium'>Search syntax</p>
                {sections.map((section) => (
                    <div key={section.title} className='flex flex-col gap-1.5'>
                        <p className='text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase'>
                            {section.title}
                        </p>
                        <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1'>
                            {section.rows.map((row) => (
                                <div key={row.syntax} className='contents'>
                                    <dt className='font-mono text-[0.7rem] break-all text-foreground'>
                                        {row.syntax}
                                    </dt>
                                    <dd className='text-muted-foreground'>
                                        {row.description}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </PopoverContent>
        </Popover>
    );
}
