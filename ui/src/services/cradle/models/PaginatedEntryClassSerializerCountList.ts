import type { EntryClassSerializerCount } from './EntryClassSerializerCount';
import {
    EntryClassSerializerCountFromJSON,
} from './EntryClassSerializerCount';

export interface PaginatedEntryClassSerializerCountList {
    page: number;
    count: number;
    totalPages: number;
    results: Array<EntryClassSerializerCount>;
}

export function PaginatedEntryClassSerializerCountListFromJSON(
    json: any,
): PaginatedEntryClassSerializerCountList {
    if (json == null) return json;
    return {
        page: json['page'] ?? 1,
        count: json['count'] ?? 0,
        totalPages: json['total_pages'] ?? 1,
        results: (json['results'] ?? []).map(EntryClassSerializerCountFromJSON),
    };
}
