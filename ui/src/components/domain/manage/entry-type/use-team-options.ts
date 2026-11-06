import type { Option } from '@/components/custom/multi-select';
import { $api } from '@services/openapi/client';

import { useMemo } from 'react';

/** Teams as multi-select options, for reserving an entity type to them. */
export function useTeamOptions(): Option[] {
    const { data: teamsPage } = $api.useQuery('get', '/teams/', {
        params: { query: { page: 1, page_size: 200 } },
    });

    return useMemo(
        () =>
            (teamsPage?.results ?? []).map((team) => ({
                value: team.id as string,
                label: team.name,
            })),
        [teamsPage],
    );
}
