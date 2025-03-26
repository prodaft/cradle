# Generated by Django 5.0.4 on 2025-03-25 21:56

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            """
            DROP FUNCTION IF EXISTS get_readable_notes;
            DROP FUNCTION IF EXISTS get_related_entry_paths_for_user;
            DROP FUNCTION IF EXISTS get_minimum_distances_for_user;
            DROP FUNCTION IF EXISTS get_paths_of_length_n_between_two_entries;
            DROP FUNCTION IF EXISTS find_all_paths;
            """
        ),
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION find_all_paths(
                target_entry_id UUID,
                v BIT(2048),
                max_depth INT,
                targets UUID[],
                timerange_start TIMESTAMP,
                timerange_stop TIMESTAMP
            )
            RETURNS TABLE (
                path UUID[]
            )
            LANGUAGE plpgsql
            AS
            $$
            BEGIN
                RETURN QUERY
                WITH RECURSIVE cte (
                    entry_id,
                    path_arr,
                    is_cycle
                ) AS (

                    -- 1) Base case: start with the target entry
                    SELECT
                        target_entry_id AS entry_id,
                        ARRAY[target_entry_id] AS path_arr,
                        FALSE AS is_cycle

                    UNION ALL

                    -- 2) Recursive case: follow the relation graph
                    SELECT
                        nr.dst_entry_id,
                        cte.path_arr || nr.dst_entry_id,
                        nr.dst_entry_id = ANY(cte.path_arr) AS is_cycle
                    FROM cte
                    JOIN entries_relation nr
                        ON nr.src_entry_id = cte.entry_id
                    WHERE
                        -- Only continue recursion if we haven't formed a cycle
                        NOT is_cycle
                        AND array_length(cte.path_arr, 1) < max_depth
                        AND nr.created_at BETWEEN timerange_start AND timerange_stop
                        -- Continue only along accessible paths
                        AND ((v | nr.access_vector) = v)
                )
                SELECT
                    cte.path_arr AS path
                FROM cte
                WHERE cte.entry_id = ANY(targets);
            END;
            $$;

            """
        ),
    ]
