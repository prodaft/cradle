# Recreates enrichment notification tables dropped by intelio.0025 (RunSQL) without
# being recreated afterward. FK columns use uuid to match intelio_enrichmentrequest.id
# after 0025. Idempotent: CREATE/INDEX IF NOT EXISTS; constraints only if missing.
#
# Requires intelio.0025 so intelio_enrichmentrequest exists with UUID primary key.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0010_alter_accessgrantednotification_entity_and_more"),
        ("intelio", "0025_change_enrichmentrequest_pk_to_uuid"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS "notifications_enrichmentcompletenotification" (
                "messagenotification_ptr_id" uuid NOT NULL PRIMARY KEY,
                "enrichment_request_id" uuid NOT NULL
            );
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'notifications_enrich_messagenotification__82930111_fk_notificat'
                ) THEN
                    ALTER TABLE "notifications_enrichmentcompletenotification"
                        ADD CONSTRAINT "notifications_enrich_messagenotification__82930111_fk_notificat"
                        FOREIGN KEY ("messagenotification_ptr_id")
                        REFERENCES "notifications_messagenotification" ("id")
                        DEFERRABLE INITIALLY DEFERRED;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'notifications_enrich_enrichment_request_i_869c9edf_fk_intelio_e'
                ) THEN
                    ALTER TABLE "notifications_enrichmentcompletenotification"
                        ADD CONSTRAINT "notifications_enrich_enrichment_request_i_869c9edf_fk_intelio_e"
                        FOREIGN KEY ("enrichment_request_id")
                        REFERENCES "intelio_enrichmentrequest" ("id")
                        DEFERRABLE INITIALLY DEFERRED;
                END IF;
            END $$;
            CREATE INDEX IF NOT EXISTS "notifications_enrichmentco_enrichment_request_id_869c9edf"
                ON "notifications_enrichmentcompletenotification" ("enrichment_request_id");

            CREATE TABLE IF NOT EXISTS "notifications_enrichmenterrornotification" (
                "messagenotification_ptr_id" uuid NOT NULL PRIMARY KEY,
                "error_message" text NULL,
                "enrichment_request_id" uuid NOT NULL
            );
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'notifications_enrich_messagenotification__425f1d88_fk_notificat'
                ) THEN
                    ALTER TABLE "notifications_enrichmenterrornotification"
                        ADD CONSTRAINT "notifications_enrich_messagenotification__425f1d88_fk_notificat"
                        FOREIGN KEY ("messagenotification_ptr_id")
                        REFERENCES "notifications_messagenotification" ("id")
                        DEFERRABLE INITIALLY DEFERRED;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'notifications_enrich_enrichment_request_i_71505a4a_fk_intelio_e'
                ) THEN
                    ALTER TABLE "notifications_enrichmenterrornotification"
                        ADD CONSTRAINT "notifications_enrich_enrichment_request_i_71505a4a_fk_intelio_e"
                        FOREIGN KEY ("enrichment_request_id")
                        REFERENCES "intelio_enrichmentrequest" ("id")
                        DEFERRABLE INITIALLY DEFERRED;
                END IF;
            END $$;
            CREATE INDEX IF NOT EXISTS "notifications_enrichmenter_enrichment_request_id_71505a4a"
                ON "notifications_enrichmenterrornotification" ("enrichment_request_id");
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
