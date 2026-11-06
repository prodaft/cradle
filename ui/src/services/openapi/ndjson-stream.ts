/**
 * NDJSON: stream parsing + GET helpers that expect ``application/x-ndjson`` bodies.
 */

import { fetchClient } from './client';
import type { paths } from './schema';

const NDJSON_MEDIA_TYPE = 'application/x-ndjson';

/** Paths whose GET documents a 200 ``application/x-ndjson`` body. */
export type NdjsonPath = {
    [P in keyof paths]: paths[P] extends {
        get: { responses: { 200: { content: { [NDJSON_MEDIA_TYPE]: unknown } } } };
    }
        ? P
        : never;
}[keyof paths];

/** One NDJSON line of the stream at ``P``, as documented in the schema. */
export type NdjsonRow<P extends NdjsonPath> =
    paths[P]['get']['responses'][200]['content'][typeof NDJSON_MEDIA_TYPE];

export type NdjsonGetParams<P extends NdjsonPath> = paths[P] extends {
    get: { parameters?: infer Params };
}
    ? Params
    : never;

function assertNdjsonContentType(response: Response | undefined): void {
    if (!response) {
        return;
    }
    const raw = response.headers.get('content-type');
    if (!raw) {
        return;
    }
    const mime = raw.split(';')[0]?.trim().toLowerCase() ?? '';
    if (mime !== NDJSON_MEDIA_TYPE) {
        throw new Error(
            `Expected NDJSON body (application/x-ndjson), got Content-Type: ${raw}`,
        );
    }
}

/**
 * Parse a UTF-8 NDJSON (newline-delimited JSON) body from a ReadableStream.
 * Each complete line is JSON.parse'd; an incomplete trailing line is parsed after EOF.
 */
async function collectNdjsonFromStream<T>(
    stream: ReadableStream<Uint8Array> | null | undefined,
): Promise<T[]> {
    if (!stream) {
        return [];
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const out: T[] = [];
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const t = line.trim();
            if (t) {
                try {
                    out.push(JSON.parse(t) as T);
                } catch (cause) {
                    throw new Error(`NDJSON parse error on line: ${t.slice(0, 120)}`, {
                        cause,
                    });
                }
            }
        }
    }
    const tail = buffer.trim();
    if (tail) {
        try {
            out.push(JSON.parse(tail) as T);
        } catch (cause) {
            throw new Error(
                `NDJSON parse error on trailing fragment: ${tail.slice(0, 120)}`,
                { cause },
            );
        }
    }
    return out;
}

async function getNdjsonList<T>(
    load: () => Promise<{ data?: unknown; error?: unknown; response?: Response }>,
): Promise<T[]> {
    const result = await load();
    const { data, error, response } = result as {
        data?: ReadableStream<Uint8Array> | null;
        error?: unknown;
        response?: Response;
    };
    if (error) {
        throw { response, error };
    }
    assertNdjsonContentType(response);
    return collectNdjsonFromStream<T>(data);
}

/**
 * Imperative NDJSON GET (e.g. mutations, non-React code). Prefer ``useNdjsonQuery`` in components.
 *
 * Mirrors TanStack's ``queryClient.fetchQuery``: one-shot fetch returning the full collected list.
 */
export async function fetchNdjson<P extends NdjsonPath>(args: {
    path: P;
    params?: NdjsonGetParams<P>;
}): Promise<NdjsonRow<P>[]> {
    const { path, params } = args;
    return getNdjsonList<NdjsonRow<P>>(() =>
        fetchClient.GET(path, {
            ...(params !== undefined ? { params } : {}),
            parseAs: 'stream',
        } as Parameters<typeof fetchClient.GET>[1]),
    );
}
