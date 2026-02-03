import type { UserRetrieve } from './UserRetrieve';
import { UserRetrieveFromJSON } from './UserRetrieve';

export interface PaginatedUserRetrieveList {
    page: number;
    count: number;
    totalPages: number;
    results: Array<UserRetrieve>;
}

export function PaginatedUserRetrieveListFromJSON(
    json: any,
): PaginatedUserRetrieveList {
    if (json == null) return json;
    return {
        page: json['page'] ?? 1,
        count: json['count'] ?? 0,
        totalPages: json['total_pages'] ?? 1,
        results: (json['results'] ?? []).map(UserRetrieveFromJSON),
    };
}
