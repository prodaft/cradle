"""
Django management command to invalidate all open upload sessions.

This command finds all pending uploads (both file uploads and digest uploads)
and cleans them up by deleting the S3 objects and database records.
"""

from django.core.management.base import BaseCommand

from file_transfer.models import PendingUpload
from file_transfer.s3_utils import delete_object, exists
from file_transfer.storage import DigestStorage, FileTransferStorage


class Command(BaseCommand):
    help = "Invalidate all open upload sessions (PendingUpload and PendingDigestUpload)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompt",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]

        # Count pending uploads
        file_uploads = PendingUpload.objects.all()
        file_upload_count = file_uploads.count()

        # Try to import digest uploads (may not be available)
        try:
            from intelio.models.uploads import PendingDigestUpload

            digest_uploads = PendingDigestUpload.objects.all()
            digest_upload_count = digest_uploads.count()
        except ImportError:
            self.stdout.write(self.style.WARNING("intelio app not available - skipping digest uploads"))
            digest_uploads = []
            digest_upload_count = 0

        total_count = file_upload_count + digest_upload_count

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS("No pending uploads found."))
            return

        # Show summary
        self.stdout.write(self.style.WARNING(f"\nFound {total_count} pending upload(s):"))
        self.stdout.write(f"  - File uploads: {file_upload_count}")
        self.stdout.write(f"  - Digest uploads: {digest_upload_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN MODE - No changes will be made]\n"))
        else:
            # Confirm deletion
            if not force:
                confirm = input("\nThis will delete all pending uploads and their S3 objects. Are you sure? [y/N]: ")
                if confirm.lower() != "y":
                    self.stdout.write(self.style.ERROR("Aborted."))
                    return

        # Clean up file uploads
        file_deleted_count = 0
        file_s3_deleted_count = 0

        self.stdout.write("\nCleaning up file uploads...")
        for pending in file_uploads:
            if dry_run:
                self.stdout.write(f"  [DRY RUN] Would delete: {pending.object_key}")
                if exists(FileTransferStorage.bucket_name, pending.object_key):
                    self.stdout.write("    [DRY RUN] Would delete S3 object")
            else:
                # Delete S3 object if exists
                if exists(FileTransferStorage.bucket_name, pending.object_key):
                    try:
                        delete_object(FileTransferStorage.bucket_name, pending.object_key)
                        file_s3_deleted_count += 1
                        self.stdout.write(self.style.SUCCESS(f"  ✓ Deleted S3 object: {pending.object_key}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"  ✗ Failed to delete S3 object {pending.object_key}: {e}"))

                # Delete database record
                pending.delete()
                file_deleted_count += 1

        # Clean up digest uploads
        digest_deleted_count = 0
        digest_s3_deleted_count = 0

        if digest_upload_count > 0:
            self.stdout.write("\nCleaning up digest uploads...")
            for pending in digest_uploads:
                if dry_run:
                    self.stdout.write(f"  [DRY RUN] Would delete: {pending.object_key}")
                    if exists(DigestStorage.bucket_name, pending.object_key):
                        self.stdout.write("    [DRY RUN] Would delete S3 object")
                else:
                    # Delete S3 object if exists
                    if exists(DigestStorage.bucket_name, pending.object_key):
                        try:
                            delete_object(DigestStorage.bucket_name, pending.object_key)
                            digest_s3_deleted_count += 1
                            self.stdout.write(self.style.SUCCESS(f"  ✓ Deleted S3 object: {pending.object_key}"))
                        except Exception as e:
                            self.stdout.write(
                                self.style.ERROR(f"  ✗ Failed to delete S3 object {pending.object_key}: {e}")
                            )

                    # Delete database record
                    pending.delete()
                    digest_deleted_count += 1

        # Print summary
        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN SUMMARY:"))
            self.stdout.write(f"  Would delete {file_upload_count} file upload record(s)")
            self.stdout.write(f"  Would delete {digest_upload_count} digest upload record(s)")
        else:
            self.stdout.write(self.style.SUCCESS("CLEANUP SUMMARY:"))
            self.stdout.write(f"  Deleted {file_deleted_count} file upload record(s)")
            self.stdout.write(f"  Deleted {file_s3_deleted_count} file S3 object(s)")
            if digest_upload_count > 0:
                self.stdout.write(f"  Deleted {digest_deleted_count} digest upload record(s)")
                self.stdout.write(f"  Deleted {digest_s3_deleted_count} digest S3 object(s)")
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ Successfully invalidated {file_deleted_count + digest_deleted_count} upload session(s)"
                )
            )
