/**
 * TanStack Query wrapper for NDJSON GETs (single request, full list in cache when settled).
 */

import {
    fetchNdjson,
    type NdjsonGetParams,
    type NdjsonPath,
} from '@services/openapi/ndjson-stream';
import {
    useQuery,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
} from '@tanstack/react-query';

/** Row type: OpenAPI does not type NDJSON line bodies; default ``any`` matches prior ``fetchAll*`` ergonomics. */
export type UseNdjsonQueryOptions<P extends NdjsonPath, TItem = any> = {
    path: P;
    params?: NdjsonGetParams<P>;
    queryKey: QueryKey;
} & Omit<UseQueryOptions<TItem[], Error, TItem[], QueryKey>, 'queryKey' | 'queryFn'>;

/**
 * Same idea as ``useQuery``, but ``queryFn`` runs a typed NDJSON GET and collects lines into an array.
 */
export function useNdjsonQuery<P extends NdjsonPath, TItem = any>(
    options: UseNdjsonQueryOptions<P, TItem>,
): UseQueryResult<TItem[]> {
    const { path, params, queryKey, ...queryOptions } = options;
    return useQuery({
        queryKey,
        queryFn: () => fetchNdjson<P, TItem>({ path, params }),
        ...queryOptions,
    });
}
