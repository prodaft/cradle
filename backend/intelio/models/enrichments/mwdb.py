# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl
from typing import Optional
from django.db import models
from entries.models import Entry, Relation
from entries.enums import RelationReason
from ..base import BaseEnricher
from ..mappings.mwdb import MWDBMapping
import logging
import mwdblib

logger = logging.getLogger(__name__)


class MWDBEnricher(BaseEnricher):
    """
    Enriches file hashes with MWDB (Malware Database) information.

    MWDB (mwdb.cert.pl) is a malware repository and analysis system operated by CERT.PL.
    This enricher queries file hashes to retrieve associated malware data, attributes,
    and relationships. Can optionally extract related hashes as separate entries.

    Supported entry classes:
    - hash (MD5, SHA1, SHA256, SHA512 file hashes)

    API Documentation: https://mwdb.readthedocs.io/
    Requires: mwdblib Python package

    Relation details schema:
    {
        "not_found": bool,         # True if hash not found in MWDB
        "data": {                  # File metadata (if found)
            "id": str,
            "type": str,           # e.g., "file"
            "md5": str,
            "sha1": str,
            "sha256": str,
            "sha512": str,
            "crc32": str,
            "ssdeep": str,
            "file_name": str,
            "file_size": int,
            "file_type": str,
            "upload_time": str,
            "tags": [str],
            "parents": [...]       # Parent objects
        },
        "attributes": [            # Associated attributes (if found)
            {
                "key": str,
                "value": str
            }
        ],
        "permalink": str           # Link to MWDB entry
    }
    """

    display_name = "MWDB"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="MWDB API key from https://mwdb.cert.pl/",
        ),
        "mwdb_url": models.URLField(
            default="https://mwdb.cert.pl",
            help_text="MWDB instance URL",
        ),
        "extract_hashes": models.BooleanField(
            default=True,
            blank=True,
            help_text="Extract related hashes (parents, children) as separate entries",
        ),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        if not self.settings.get("api_key"):
            return "MWDB API key is required"

        if not entries:
            return "No entries provided for enrichment"

        # Warn if mappings are missing and hash extraction is enabled
        if (
            self.settings.get("extract_hashes", True)
            and not MWDBMapping.objects.exists()
        ):
            self.request._append_warning(
                "No MWDB type mappings configured. "
                "Related hash extraction will be disabled. "
                "Configure MWDBMapping in Django admin to enable hash extraction."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich file hashes with MWDB data."""
        api_key = self.settings["api_key"]
        mwdb_url = self.settings.get("mwdb_url", "https://mwdb.cert.pl")
        extract_hashes = self.settings.get("extract_hashes", True)

        # Initialize MWDB client
        try:
            mwdb = mwdblib.MWDB(api_url=mwdb_url, api_key=api_key)
        except Exception as e:
            self.request._append_warning(f"Failed to initialize MWDB client: {str(e)}")
            return

        enrichment_entry = self.request.entry

        for entry in entries:
            try:
                result = {}

                # Query MWDB for file hash
                try:
                    file_info = mwdb.query_file(entry.name)
                except mwdblib.exc.ObjectNotFoundError:
                    result["not_found"] = True
                except Exception as exc:
                    logger.exception(exc)
                    self.request._append_warning(
                        f"MWDB query failed for {entry.name}: {str(exc)}"
                    )
                    result["not_found"] = True
                else:
                    # File found - extract data
                    result["data"] = file_info.data
                    result["not_found"] = False

                    # Try to get attributes (may not exist)
                    try:
                        result["attributes"] = file_info.attributes
                    except Exception as e:
                        logger.warning(
                            f"Failed to get attributes: {e}", stack_info=True
                        )
                        self.request._append_warning(
                            f"Could not retrieve attributes for {entry.name}: {str(e)}"
                        )

                    # Add permalink
                    result["permalink"] = f"{mwdb_url}/file/{entry.name}"

                # Create main relation
                Relation.objects.create(
                    e1=entry,
                    e2=enrichment_entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    inherit_av=True,
                    details=result,
                )

                # Extract related hashes if enabled and data was found
                if extract_hashes and not result.get("not_found"):
                    self._extract_related_hashes(entry, result.get("data", {}))

            except Exception as e:
                self.request._append_warning(
                    f"Unexpected error enriching {entry.name}: {str(e)}"
                )

    def _extract_related_hashes(self, entry: Entry, data: dict) -> None:
        """Extract related hashes from MWDB data using MWDBMapping."""
        # Get type mapping from MWDB artifact types to CRADLE entry classes
        typemapping = MWDBMapping.get_typemapping_rev()

        # Track unmapped types
        unmapped_types = []

        # Extract hashes from the file data
        hash_fields = ["md5", "sha1", "sha256", "sha512"]

        for field in hash_fields:
            hash_value = data.get(field)
            if hash_value and hash_value != entry.name:
                # Get CRADLE entry class for this hash type
                target_class = typemapping.get(field)

                if target_class:
                    # Create entry for the hash
                    hash_entry, _ = Entry.objects.get_or_create(
                        entry_class=target_class, name=hash_value
                    )

                    # Create relation
                    Relation.objects.create(
                        e1=entry,
                        e2=hash_entry,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        content_object=self.request,
                        access_vector=self.request.access_vector,
                        inherit_av=True,
                        details={
                            "source": "mwdb_alternate_hash",
                            "hash_type": field,
                            "file_name": data.get("file_name", ""),
                        },
                    )
                elif hash_value:
                    # Track unmapped type
                    if field not in unmapped_types:
                        unmapped_types.append(field)
                        logger.debug(
                            f"Skipping MWDB hash type '{field}' - no mapping configured"
                        )

        # Extract parent hashes if available
        parent_class = typemapping.get("parent")
        parents = data.get("parents", [])
        if parents and not parent_class:
            unmapped_types.append("parent")
            logger.debug(
                "Skipping MWDB parent hashes - no mapping configured for 'parent' type"
            )

        if parent_class:
            for parent in parents:
                if isinstance(parent, dict):
                    parent_hash = parent.get("sha256") or parent.get("id")
                    if parent_hash:
                        parent_entry, _ = Entry.objects.get_or_create(
                            entry_class=parent_class, name=parent_hash
                        )

                        Relation.objects.create(
                            e1=entry,
                            e2=parent_entry,
                            reason=RelationReason.ENRICHMENT,
                            reason_context=self.name,
                            content_object=self.request,
                            access_vector=self.request.access_vector,
                            inherit_av=True,
                            details={
                                "source": "mwdb_parent",
                                "relationship": "parent",
                            },
                        )

        # Warn if unmapped types were encountered
        if unmapped_types:
            self.request._append_warning(
                f"Skipped MWDB artifact type(s) without mappings: {', '.join(unmapped_types)}. "
                f"Configure MWDBMapping in Django admin to extract these artifacts."
            )
