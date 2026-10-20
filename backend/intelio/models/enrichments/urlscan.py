from django.db import models

from ..base import BaseEnricher


class URLScanEnricher(BaseEnricher):
    """Enriches URLs and domains with URLScan.io data.

    Supported entry classes: url, domain.
    Execution runs inside an isolated container (enrichers/urlscan/).
    This class exists solely to register settings_fields for admin validation.
    """

    display_name = "URLScan"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            blank=True,
            help_text="URLScan.io API key (required for submit_result, optional for search)",
        ),
        "analysis_mode": models.CharField(
            max_length=20,
            default="search",
            choices=[
                ("search", "Search existing scans"),
                ("submit_result", "Submit URL and get results"),
            ],
            help_text="Analysis mode: 'search' queries existing scans, 'submit_result' submits new scans",
        ),
        "visibility": models.CharField(
            max_length=20,
            default="public",
            choices=[
                ("public", "Public"),
                ("unlisted", "Unlisted"),
                ("private", "Private"),
            ],
            help_text="Scan visibility (only for submit_result mode)",
        ),
        "search_size": models.IntegerField(default=10, help_text="Maximum number of search results to return"),
        "timeout": models.IntegerField(default=30, help_text="API request timeout in seconds"),
        "extract_artifacts": models.BooleanField(
            default=True,
            blank=True,
            help_text="Extract discovered IPs and domains as separate entries",
        ),
    }
