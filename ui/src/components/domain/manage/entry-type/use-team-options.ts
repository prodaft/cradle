import type { Option } from '@/components/custom/multi-select';
import { queryKeys } from '@/hooks/query';
import { fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

/** Teams as multi-select options, for reserving an entity type to them. */
export function useTeamOptions(): Option[] {
    const { data: teamsPage } = useQuery({
        queryKey: queryKeys.teams.list({ page: 1, pageSize: 200 }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/teams/', {
                params: { query: { page: 1, page_size: 200 } },
            });
            if (error) throw { response, error };
            return data;
        },
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
