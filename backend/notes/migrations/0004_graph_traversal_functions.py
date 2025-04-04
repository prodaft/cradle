# Generated by Django 5.0.4 on 2024-10-23 14:47

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("notes", "0003_note_edit_timestamp_note_editor"),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION get_notes_with_access_types(user_uuid UUID)
            RETURNS TABLE (note_id UUID, access_types TEXT[]) AS $$
            BEGIN
                RETURN QUERY
                SELECT note_data.note_id, note_data.access_types
                FROM (
                    SELECT ne.note_id, ARRAY_AGG(DISTINCT COALESCE(a.access_type, '<none>')::TEXT) AS access_types
                    FROM notes_note_entries AS ne JOIN entries_entry ee ON ne.entry_id = ee.id
                    JOIN entries_entryclass ec ON ee.entry_class_id = ec.subtype
                    LEFT JOIN (SELECT * FROM access_access WHERE user_id = user_uuid) a ON ne.entry_id = a.entity_id
                    WHERE ec.type = 'entity'
                    GROUP BY ne.note_id
                ) AS note_data;
            END;
            $$ LANGUAGE plpgsql;
            """
        ),
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION get_related_entry_ids(target_entry_id UUID)
            RETURNS TABLE (entry_id UUID) AS $$
            BEGIN
                RETURN QUERY
                SELECT n.dst_entry_id AS entry_id
                FROM notes_relation n
                WHERE n.src_entry_id = target_entry_id;
            END;
            $$ LANGUAGE plpgsql;
            """
        ),
        migrations.RunSQL(
            """
            CREATE OR REPLACE FUNCTION get_related_entry_ids_for_user(target_entry_id UUID, user_id UUID)
            RETURNS TABLE (entry_id UUID) AS $$
            BEGIN
                RETURN QUERY
                SELECT n.dst_entry_id AS entry_id
                FROM notes_relation n
                WHERE n.note_id IN (
                    SELECT ne.note_id
                    FROM notes_note_entries ne
                    WHERE ne.note_id IN (
                      SELECT note_id FROM get_notes_with_access_types(user_id) nen
                      WHERE '<none>'<>ANY(nen.access_types)
                    )
                    GROUP BY ne.note_id
                ) AND n.src_entry_id = target_entry_id;
            END;
            $$ LANGUAGE plpgsql;
            """
        ),
    ]
