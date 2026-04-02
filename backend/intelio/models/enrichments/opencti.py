# Ported from IntelOwl: https://github.com/intelowlproject/IntelOwl
import logging
from typing import Optional

import pycti
from django.db import models
from pycti.api.opencti_api_client import File

from entries.enums import RelationReason
from entries.models import Entry, Relation

from ...constants import (
    INTELIO_ENRICHMENT_MESSAGE_INIT_FAILED,
    INTELIO_ENRICHMENT_MESSAGE_REQUEST_FAILED,
    INTELIO_OPENCTI_RESULT_TRIM_MAP,
)
from ..base import BaseEnricher
from ..mappings.opencti import OpenCTIMapping

logger = logging.getLogger(__name__)


class OpenCTIEnricher(BaseEnricher):
    """Enriches observables with OpenCTI threat intelligence data.

    OpenCTI is an open-source platform for managing cyber threat intelligence.
    This enricher queries OpenCTI for observables and retrieves associated reports.
    Can optionally extract related observables (IPs, domains, etc.) as separate entries.

    Supported entry classes:
    - All entry classes (IP addresses, domains, URLs, hashes, emails, etc.)

    API Documentation: https://docs.opencti.io/
    Requires: pycti Python package

    Relation details schema:
    {
        "observables": [           # Array of matching observables
            {
                "id": str,
                "entity_type": str,
                "observable_value": str,
                "created": str,
                "updated": str,
                "confidence": int,
                "reports": [       # Associated reports
                    {
                        "id": str,
                        "name": str,
                        "description": str,
                        "published": str,
                        "report_types": [str],
                        "confidence": int
                    }
                ]
            }
        ],
        "total_observables": int,
        "instance_url": str        # OpenCTI instance URL
    }
    """

    display_name = "OpenCTI"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="OpenCTI API token",
        ),
        "instance_url": models.URLField(
            help_text="OpenCTI instance URL (e.g., https://demo.opencti.io)",
        ),
        "ssl_verify": models.BooleanField(
            default=True,
            blank=True,
            help_text="Verify SSL certificates",
        ),
        "exact_search": models.BooleanField(
            default=True,
            blank=True,
            help_text="Only return exact matches for observable value",
        ),
        "timeout": models.IntegerField(
            default=30,
            help_text="API request timeout in seconds",
        ),
        "extract_observables": models.BooleanField(
            default=False,
            blank=True,
            help_text="Extract related observables from reports as separate entries",
        ),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before enrichment."""
        if not self.settings.get("api_key"):
            return "Add your OpenCTI API key before running this enrichment."

        if not self.settings.get("instance_url"):
            return "Add your OpenCTI server URL before running this enrichment."

        if not entries:
            return "Select at least one entry to enrich."

        # Warn if mappings are missing and observable extraction is enabled
        if self.settings.get("extract_observables", False) and not OpenCTIMapping.objects.exists():
            self.request._append_warning(
                "No OpenCTI type mappings are configured. "
                "Observable extraction will be disabled until an administrator adds them in the admin site."
            )

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Enrich observables with OpenCTI data."""
        api_key = self.settings["api_key"]
        instance_url = self.settings["instance_url"]
        ssl_verify = self.settings.get("ssl_verify", True)
        exact_search = self.settings.get("exact_search", True)

        # Configure proxies if needed (empty dict for now)
        proxies = {}

        # Initialize OpenCTI client
        try:
            opencti_instance = pycti.OpenCTIApiClient(
                url=instance_url,
                token=api_key,
                ssl_verify=ssl_verify,
                proxies=proxies,
            )
        except Exception:
            logger.warning("Failed to initialize OpenCTI client", exc_info=True)
            self.request._append_warning(INTELIO_ENRICHMENT_MESSAGE_INIT_FAILED)
            return

        enrichment_entry = self.request.entry

        for entry in entries:
            try:
                # Search for observables
                observables = pycti.StixCyberObservable(opencti_instance, File).list(search=entry.name)

                # Filter exact matches if exact_search is set
                if exact_search:
                    observables = [obs for obs in observables if obs.get("observable_value") == entry.name]

                # Process each observable
                for observable in observables:
                    try:
                        # Get reports linked to this observable
                        reports = pycti.Report(opencti_instance).list(
                            filters=[
                                {
                                    "key": "objectContains",
                                    "values": [observable["id"]],
                                }
                            ]
                        )

                        # Trim observable data for lighter output
                        for key in INTELIO_OPENCTI_RESULT_TRIM_MAP["observable"]:
                            observable.pop(key, None)

                        # Trim report data
                        for report in reports:
                            for key in INTELIO_OPENCTI_RESULT_TRIM_MAP["report"]:
                                report.pop(key, None)

                        observable["reports"] = reports

                    except Exception:
                        logger.warning(
                            "Failed to get reports for observable %s",
                            observable.get("id"),
                            exc_info=True,
                        )
                        observable["reports"] = []
                        observable["error"] = "Related reports could not be loaded."

                # Create relation with results
                result = {
                    "observables": observables,
                    "total_observables": len(observables),
                    "instance_url": instance_url,
                }

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

            except Exception:
                logger.warning("OpenCTI query failed for entry %s", entry.pk, exc_info=True)
                self.request._append_warning(INTELIO_ENRICHMENT_MESSAGE_REQUEST_FAILED)
