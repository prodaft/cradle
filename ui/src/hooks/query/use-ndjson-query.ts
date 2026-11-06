/**
 * TanStack Query wrapper for NDJSON GETs (single request, full list in cache when settled).
 */

import {
    fetchNdjson,
    type NdjsonGetParams,
    type NdjsonPath,
    type NdjsonRow,
} from '@services/openapi/ndjson-stream';
import {
    useQuery,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
} from '@tanstack/react-query';

/** Rows are typed from the path's documented ``application/x-ndjson`` line schema. */
type UseNdjsonQueryOptions<P extends NdjsonPath, TData> = {
    path: P;
    params?: NdjsonGetParams<P>;
    /** Defaults to ``ndjsonKey(path, params)``, which ``apiKey(path)`` invalidates. */
    queryKey?: QueryKey;
} & Omit<
    UseQueryOptions<NdjsonRow<P>[], Error, TData, QueryKey>,
    'queryKey' | 'queryFn'
>;

/** Same shape as ``$api`` keys (``['get', path, { params }]``), so ``apiKey(path)`` matches it. */
const ndjsonKey = <P extends NdjsonPath>(path: P, params?: NdjsonGetParams<P>) =>
    params === undefined
        ? (['get', path] as const)
        : (['get', path, { params }] as const);

/**
 * Same idea as ``useQuery``, but ``queryFn`` runs a typed NDJSON GET and collects lines into an array.
 */
export function useNdjsonQuery<P extends NdjsonPath, TData = NdjsonRow<P>[]>(
    options: UseNdjsonQueryOptions<P, TData>,
): UseQueryResult<TData> {
    const { path, params, queryKey, ...queryOptions } = options;
    return useQuery({
        queryKey: queryKey ?? ndjsonKey(path, params),
        queryFn: () => fetchNdjson({ path, params }),
        ...queryOptions,
    });
}
