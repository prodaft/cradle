import { dayEndIso, dayStartIso } from '@/lib/search-query/dates';
import type {
    QualifierSpec,
    SearchSchema,
    SearchState,
} from '@/lib/search-query/search-schema';
import type { operations } from '@services/openapi/schema';

type EventLogsListQuery = NonNullable<
    operations['event_logs_list']['parameters']['query']
>;
type EventType = NonNullable<EventLogsListQuery['type']>;

const EVENT_TYPE_VALUES = [
    { value: 'create', label: 'Create' },
    { value: 'edit', label: 'Edit' },
    { value: 'delete', label: 'Delete' },
    { value: 'fetch', label: 'Fetch' },
    { value: 'login', label: 'Login' },
] as const satisfies readonly { value: EventType; label: string }[];

const TYPE_QUALIFIER: QualifierSpec = {
    key: 'type',
    kind: 'enum',
    description: 'event type',
    values: EVENT_TYPE_VALUES,
};

const DATE_QUALIFIER: QualifierSpec = {
    key: 'date',
    kind: 'date',
    description: 'event date',
};

/** Activity log scoped to a fixed user: no `user:` qualifier. */
export const USER_SCOPED_ACTIVITY_SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [TYPE_QUALIFIER, DATE_QUALIFIER],
};

export const ACTIVITY_SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        {
            key: 'user',
            kind: 'text',
            description: 'username (exact)',
            aliases: ['username'],
            example: 'admin',
        },
        TYPE_QUALIFIER,
        DATE_QUALIFIER,
    ],
};

function isEventType(value: string | undefined): value is EventType {
    return EVENT_TYPE_VALUES.some((o) => o.value === value);
}

/** Maps search-bar state to the `/logs/` query params it controls (`user:` excluded). */
export function activitySearchParams(
    state: SearchState,
): Pick<EventLogsListQuery, 'type' | 'start_date' | 'end_date' | 'search'> {
    const type = state.values.type?.[0];
    const date = state.dates.date;
    return {
        type: isEventType(type) ? type : undefined,
        // DateTimeFilter params; date qualifier bounds are inclusive local days.
        start_date: dayStartIso(date?.after),
        end_date: dayEndIso(date?.before),
        search: state.q || undefined,
    };
}
