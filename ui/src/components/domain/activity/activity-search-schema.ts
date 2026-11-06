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

const EVENT_TYPE_LABELS = {
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    fetch: 'Fetch',
    login: 'Login',
} satisfies Record<EventType, string>;

const EVENT_TYPE_VALUES = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(
    (value) => ({
        value,
        label: EVENT_TYPE_LABELS[value],
    }),
);

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
): Pick<EventLogsListQuery, 'type' | 'created_at_gte' | 'created_at_lte' | 'search'> {
    const type = state.values.type?.[0];
    const date = state.dates.date;
    return {
        type: isEventType(type) ? type : undefined,
        created_at_gte: dayStartIso(date?.after),
        created_at_lte: dayEndIso(date?.before),
        search: state.q || undefined,
    };
}
