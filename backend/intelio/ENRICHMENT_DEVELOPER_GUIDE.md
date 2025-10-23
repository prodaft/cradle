# Enrichment Developer Guide

This guide provides everything you need to develop custom enrichment plugins for the CRADLE platform. Enrichments automatically enhance entries (artifacts) with additional related information from external sources or through data processing.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Creating a Custom Enricher](#creating-a-custom-enricher)
- [Storing Enrichment Results](#storing-enrichment-results)
- [Error Handling](#error-handling)
- [Working with Entry Classes](#working-with-entry-classes)
- [Using Class Mappings](#using-class-mappings)
- [Configuration and Settings](#configuration-and-settings)
- [Testing Your Enricher](#testing-your-enricher)
- [Porting from IntelOwl](#porting-from-intelowl)
- [Best Practices](#best-practices)

---

## Architecture Overview

### Key Components

1. **BaseEnricher**: Abstract base class all enrichers inherit from
2. **EnricherSettings**: Database model storing enricher configuration
3. **EnrichmentRequest**: Database model representing an enrichment job
4. **Relation**: Database model storing relationships between entries
5. **Entry**: Database model representing artifacts (IPs, domains, hashes, etc.)
6. **EntryClass**: Database model defining artifact types

### Execution Flow

```
User creates EnrichmentRequest
         ↓
AFTER_CREATE hook triggers Celery task
         ↓
start_enrich task spawns parallel run_enricher tasks
         ↓
Each run_enricher calls enricher.enrich(entries)
         ↓
Enricher creates Entry + Relation objects
         ↓
Enricher updates status and errors
         ↓
Results available via API
```

---

## Creating a Custom Enricher

### Step 1: Create Your Enricher Class

Create a new file in `intelio/models/enrichments/your_enricher.py`:

```python
from typing import Optional
from django.db import models
from entries.enums import RelationReason
from entries.models import Entry, EntryClass, Relation
from ..base import BaseEnricher


class MyCustomEnricher(BaseEnricher):
    """
    Enriches entries by performing custom analysis.
    """

    # Required: User-facing display name
    display_name = "My Custom Enricher"

    # Required: Define configuration schema using Django model fields
    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="API key for external service"
        ),
        "timeout": models.IntegerField(
            default=30,
            help_text="Request timeout in seconds"
        ),
        "enabled_features": models.BooleanField(
            default=True,
            help_text="Enable advanced features"
        ),
    }

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """
        Optional: Validate entries before enrichment.

        Args:
            entries: List of Entry objects to be enriched

        Returns:
            Error message string if validation fails, None if valid
        """
        # Example: Check if we have necessary configuration
        if not self.settings.get("api_key"):
            return "API key is required but not configured"

        # Example: Check if entries are valid
        if not entries:
            return "No entries provided for enrichment"

        return None  # Validation passed

    def enrich(self, entries: list[Entry]) -> None:
        """
        Required: Main enrichment logic.

        Args:
            entries: List of Entry objects to enrich

        This method should:
        1. Process each entry
        2. Create new Entry objects for discovered artifacts
        3. Create Relation objects linking entries
        4. Handle errors gracefully using warnings
        """
        # Access your settings
        api_key = self.settings["api_key"]
        timeout = self.settings.get("timeout", 30)

        # Prepare to bulk create relations
        relations_to_create = []

        for entry in entries:
            try:
                # Your enrichment logic here
                results = self._perform_enrichment(entry, api_key, timeout)

                # Create entries and relations for results
                for result in results:
                    # Create or get related entry
                    related_entry, created = Entry.objects.get_or_create(
                        entry_class=result["entry_class"],
                        name=result["name"]
                    )

                    # Create relation
                    relation = Relation(
                        e1=entry,
                        e2=related_entry,
                        inherit_av=True,
                        content_object=self.request,
                        access_vector=self.request.access_vector,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,  # Enricher class name
                        details={
                            "source": "my_api",
                            "confidence": result.get("confidence", 1.0),
                            "metadata": result.get("metadata", {})
                        }
                    )
                    relations_to_create.append(relation)

            except Exception as e:
                # Log non-fatal errors as warnings
                self.request._append_warning(
                    f"Failed to enrich {entry.name}: {str(e)}"
                )

        # Bulk create all relations at once for performance
        if relations_to_create:
            Relation.objects.bulk_create(relations_to_create)

    def _perform_enrichment(self, entry: Entry, api_key: str, timeout: int):
        """
        Helper method for your enrichment logic.
        """
        # Implement your enrichment logic here
        # Return list of results
        return []
```

### Step 2: Register Your Enricher

Add your enricher to `intelio/models/__init__.py`:

```python
from .enrichments.your_enricher import MyCustomEnricher as MyCustomEnricher  # noqa:F401
```

### Step 3: Create Database Migration

Run Django migrations to create the enricher settings table:

```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 4: Configure Your Enricher

Create an `EnricherSettings` instance via Django admin or API:

```python
from intelio.models import EnricherSettings
from entries.models import EntryClass

# Create settings
settings = EnricherSettings.objects.create(
    enricher_type="MyCustomEnricher",
    enabled=True,
    settings={
        "api_key": "your-api-key-here",
        "timeout": 60,
        "enabled_features": True
    }
)

# Associate with entry classes this enricher applies to
domain_class = EntryClass.objects.get(subtype="domain")
settings.for_eclasses.add(domain_class)
```

---

## Storing Enrichment Results

### Relation-Based Storage (Primary Method)

Most enrichments create **relationships between two entries** (e.g., domain → IP address). Store these as `Relation` objects:

```python
from entries.enums import RelationReason
from entries.models import Entry, Relation

# Example: DNS enrichment linking domain to IP
domain_entry = Entry.objects.get(name="example.com")
ip_entry, _ = Entry.objects.get_or_create(
    entry_class=ipv4_class,
    name="93.184.216.34"
)

relation = Relation.objects.create(
    e1=domain_entry,
    e2=ip_entry,
    reason=RelationReason.ENRICHMENT,
    reason_context=self.name,  # "MyCustomEnricher"
    content_object=self.request,
    access_vector=self.request.access_vector,
    inherit_av=True,
    details={
        "record_type": "A",
        "ttl": 3600,
        "timestamp": "2025-01-15T10:30:00Z"
    }
)
```

### Metadata Storage (details Field)

The `Relation.details` field is a flexible JSONField for storing enrichment-specific metadata:

```python
# Example: GeoIP enrichment
relation = Relation(
    e1=ip_entry,
    e2=location_entry,
    reason=RelationReason.ENRICHMENT,
    reason_context="GeoIPEnricher",
    content_object=self.request,
    access_vector=self.request.access_vector,
    inherit_av=True,
    details={
        "country_code": "US",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy_radius": 50,
        "asn": 15169,
        "organization": "Google LLC"
    }
)
```

**Guidelines for `details`:**
- Document your schema in docstrings
- Use descriptive key names
- Include timestamps when relevant
- Store confidence scores if applicable
- Keep values JSON-serializable (str, int, float, bool, list, dict)

### Non-Relational Results

If your enrichment **does not produce a relationship** between two artifacts (e.g., malware analysis, reputation scoring), create a relation to the **EnrichmentRequest entry**:

```python
# Example: Reputation score enrichment
analyzed_entry = Entry.objects.get(name="suspicious.com")

# Get the entry representing this enrichment request
enrichment_entry = self.request.entry

# Create relation with metadata in details
relation = Relation.objects.create(
    e1=analyzed_entry,
    e2=enrichment_entry,
    reason=RelationReason.ENRICHMENT,
    reason_context=self.name,
    content_object=self.request,
    access_vector=self.request.access_vector,
    inherit_av=True,
    details={
        "reputation_score": 85,
        "threat_category": "phishing",
        "blocklisted": True,
        "last_seen_malicious": "2025-01-10",
        "detections": {
            "virustotal": 45,
            "urlhaus": True
        }
    }
)
```

This approach:
- Maintains consistent storage model (always use Relations)
- Links metadata to the entry being analyzed
- Allows querying via `enrichment_request.relations.all()`
- Stores all results in the `details` field

---

## Error Handling

### Three Levels of Error Handling

#### 1. Validation Errors (pre_enrich)

Catch issues **before** enrichment starts:

```python
def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
    # Check configuration
    if not self.settings.get("api_key"):
        return "API key is required"

    # Validate API connectivity
    if not self._test_api_connection():
        return "Cannot connect to external API"

    return None  # All good
```

#### 2. Non-Fatal Warnings (during enrichment)

Handle per-entry failures without stopping the entire job:

```python
def enrich(self, entries: list[Entry]) -> None:
    for entry in entries:
        try:
            result = self._lookup_entry(entry)
            # Process result...
        except APIRateLimitError:
            self.request._append_warning(
                f"Rate limited while enriching {entry.name}"
            )
        except APINotFoundError:
            # Not necessarily an error - entry might not exist in source
            self.request._append_warning(
                f"No data found for {entry.name}"
            )
        except Exception as e:
            self.request._append_warning(
                f"Failed to enrich {entry.name}: {str(e)}"
            )
```

**Thread-safe**: `_append_warning()` uses database locking for concurrent safety.

#### 3. Fatal Errors (exceptions)

Let critical errors propagate to fail the enrichment:

```python
def enrich(self, entries: list[Entry]) -> None:
    # This will be caught by the task runner
    api_client = self._initialize_api()
    if api_client is None:
        raise RuntimeError("Failed to initialize API client")

    # Continue with enrichment...
```

When an exception is raised:
- Task runner catches it
- Error appended to `EnrichmentRequest.errors`
- Enricher status set to `ERROR`
- Exception re-raised for stack trace logging

### Error Querying

Users can view errors/warnings via API:

```json
GET /api/enrichment/{request_id}/

{
    "status": "warning",
    "errors": [
        "Enricher MyCustomEnricher failed: API authentication failed"
    ],
    "warnings": [
        "Rate limited while enriching example.com",
        "No data found for test.com"
    ],
    "enricher_status": {
        "DNSEnricher": "done",
        "MyCustomEnricher": "error"
    }
}
```

---

## Working with Entry Classes

### Understanding Entry Classes

`EntryClass` defines the **type** of artifact (domain, IP, hash, etc.). Each `Entry` has an `entry_class` that determines its semantic meaning.

### Finding Entry Classes

```python
from entries.models import EntryClass
from entries.enums import EntryType

# Get a specific entry class
ipv4_class = EntryClass.objects.get(subtype="ip")
domain_class = EntryClass.objects.get(subtype="domain")

# Filter by type
artifacts = EntryClass.objects.filter(type=EntryType.ARTIFACT)
```

### Using Entry Classes in Settings

Reference entry classes in your enricher settings:

```python
class MyCustomEnricher(BaseEnricher):
    display_name = "My Custom Enricher"

    settings_fields = {
        # Store entry class subtype as a string
        "target_class": models.CharField(
            default="domain",
            help_text="Entry class to create for results"
        )
    }

    def enrich(self, entries: list[Entry]) -> None:
        # Get the configured entry class
        target_class_name = self.settings.get("target_class", "ip")
        target_class = EntryClass.objects.get(subtype=target_class_name)

        for entry in entries:
            # Create entry with the configured class
            result_entry, _ = Entry.objects.get_or_create(
                entry_class=target_class,
                name="discovered-value"
            )
```

### Creating Entries

Always use `get_or_create` to avoid duplicates:

```python
from entries.models import Entry, EntryClass

# Get the entry class for your artifact type
hash_class = EntryClass.objects.get(subtype="hash")

# Create or retrieve entry
file_hash, created = Entry.objects.get_or_create(
    entry_class=hash_class,
    name="a1b2c3d4e5f6..."
)

if created:
    print(f"Created new entry: {file_hash.name}")
else:
    print(f"Entry already exists: {file_hash.name}")
```

### Filtering by Entry Class

Your enricher is configured with applicable entry classes via `EnricherSettings.for_eclasses`:

```python
# In your enrichment job, the run_enricher task filters entries
enricher_settings = EnricherSettings.objects.get(
    enricher_type="MyCustomEnricher"
)

# Only entries matching these classes are passed to your enricher
applicable_classes = enricher_settings.for_eclasses.all()
# Returns QuerySet of EntryClass objects
```

The task runner automatically filters entries before calling your `enrich()` method, so you only receive entries that match your configured classes.

---

## Using Class Mappings

### Purpose of Class Mappings

`ClassMapping` provides a **bridge between external type systems and CRADLE's internal entry classes**. Use this when integrating external data sources that use different type nomenclature.

### ClassMapping Architecture

```python
# Base class (abstract)
class ClassMapping(models.Model):
    id: models.UUIDField
    internal_class: ForeignKey(EntryClass)  # Links to CRADLE entry class

    class Meta:
        abstract = True
```

Subclasses add fields specific to the external system:

```python
class FalconMapping(ClassMapping):
    display_name = "falcon"

    # External type name from CrowdStrike Falcon
    type = models.CharField(max_length=255, unique=True)
```

```python
class CatalystMapping(ClassMapping):
    display_name = "catalyst"

    # External type metadata from Catalyst system
    type = models.CharField(max_length=255)
    field = models.CharField(max_length=255)
    level = models.CharField(max_length=255, blank=True, null=True)
    link_type = models.CharField(max_length=255)
    extras = models.CharField(max_length=255, blank=True, null=True)
```

### Creating Your Own Mapping

**Step 1**: Define your mapping class in `intelio/models/mappings/my_system.py`:

```python
from django.db import models
from collections import defaultdict
from ..base import ClassMapping


class MySystemMapping(ClassMapping):
    """
    Maps MySystem artifact types to CRADLE entry classes.
    """

    # Required: Display name for this mapping system
    display_name = "my_system"

    # External system's type identifier
    external_type = models.CharField(max_length=255, unique=True)

    # Optional: Additional metadata from external system
    category = models.CharField(max_length=255, blank=True)
    priority = models.IntegerField(default=0)

    @classmethod
    def get_typemapping_rev(cls):
        """
        Returns a dictionary mapping external types to EntryClass objects.
        """
        typemapping = defaultdict(lambda: None)

        for mapping in cls.objects.all():
            typemapping[mapping.external_type] = mapping.internal_class

        return typemapping
```

**Step 2**: Register in `intelio/models/__init__.py`:

```python
from .mappings.my_system import MySystemMapping as MySystemMapping  # noqa:F401
```

**Step 3**: Create mappings via Django admin or code:

```python
from intelio.models import MySystemMapping
from entries.models import EntryClass

# Map external type "IPV4_ADDR" to internal "ip" class
ipv4_class = EntryClass.objects.get(subtype="ip")
MySystemMapping.objects.create(
    internal_class=ipv4_class,
    external_type="IPV4_ADDR",
    category="network",
    priority=10
)

# Map external type "DOMAIN_NAME" to internal "domain" class
domain_class = EntryClass.objects.get(subtype="domain")
MySystemMapping.objects.create(
    internal_class=domain_class,
    external_type="DOMAIN_NAME",
    category="network",
    priority=5
)
```

### Using Mappings in Your Enricher

```python
from intelio.models.mappings.my_system import MySystemMapping

class MySystemEnricher(BaseEnricher):
    display_name = "My System Enricher"
    settings_fields = {}

    def enrich(self, entries: list[Entry]) -> None:
        # Load the type mappings
        typemapping = MySystemMapping.get_typemapping_rev()

        for entry in entries:
            # Fetch data from external system
            external_data = self._fetch_from_my_system(entry)

            for item in external_data:
                # Get external type
                external_type = item["type"]  # e.g., "IPV4_ADDR"

                # Map to internal entry class
                entry_class = typemapping[external_type]

                if entry_class is None:
                    self.request._append_warning(
                        f"No mapping found for type: {external_type}"
                    )
                    continue

                # Create entry with mapped class
                discovered_entry, _ = Entry.objects.get_or_create(
                    entry_class=entry_class,
                    name=item["value"]
                )

                # Create relation
                Relation.objects.create(
                    e1=entry,
                    e2=discovered_entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    inherit_av=True,
                    details={
                        "external_type": external_type,
                        "source": "my_system"
                    }
                )
```

### Example: Falcon Mapping Usage

From the existing codebase:

```python
from intelio.models.mappings.falcon import FalconMapping

# In a digest/enricher
typemapping = FalconMapping.get_typemapping_rev()

# External data from Falcon API
falcon_data = {
    "type": "domain",  # Falcon's type
    "value": "example.com"
}

# Map to CRADLE entry class
entry_class = typemapping[falcon_data["type"]]  # Gets EntryClass(subtype="domain")

if entry_class:
    entry, _ = Entry.objects.get_or_create(
        entry_class=entry_class,
        name=falcon_data["value"]
    )
```

### When to Use Class Mappings

✅ **Use Class Mappings when:**
- Integrating with external systems that have their own type taxonomy
- You need admin-configurable type mappings (without code changes)
- Multiple external types map to the same internal class
- You need to store additional metadata about type mappings

❌ **Don't use Class Mappings when:**
- You have a simple, fixed type mapping (use a dict in code)
- External system uses the same type names as CRADLE
- Type mapping never changes

---

## Configuration and Settings

### Defining Settings Schema

Use Django model fields to define your settings schema:

```python
from django.db import models

class MyEnricher(BaseEnricher):
    display_name = "My Enricher"

    settings_fields = {
        # Text fields
        "api_url": models.URLField(
            default="https://api.example.com",
            help_text="API endpoint URL"
        ),
        "api_key": models.CharField(
            max_length=255,
            help_text="Authentication key"
        ),

        # Numeric fields
        "timeout": models.IntegerField(
            default=30,
            help_text="Request timeout in seconds"
        ),
        "max_results": models.IntegerField(
            default=100,
            help_text="Maximum results to fetch"
        ),
        "retry_delay": models.FloatField(
            default=1.5,
            help_text="Delay between retries in seconds"
        ),

        # Boolean fields
        "verify_ssl": models.BooleanField(
            default=True,
            help_text="Verify SSL certificates"
        ),
        "enable_caching": models.BooleanField(
            default=False,
            help_text="Cache API responses"
        ),

        # Choice fields
        "log_level": models.CharField(
            max_length=20,
            default="INFO",
            choices=[
                ("DEBUG", "Debug"),
                ("INFO", "Info"),
                ("WARNING", "Warning"),
                ("ERROR", "Error")
            ],
            help_text="Logging verbosity"
        ),
    }
```

### Accessing Settings

```python
def enrich(self, entries: list[Entry]) -> None:
    # Access with default fallback
    timeout = self.settings.get("timeout", 30)

    # Direct access (may raise KeyError)
    api_key = self.settings["api_key"]

    # Check existence
    if "api_key" in self.settings:
        # Use API key
        pass
```

### Validation

Settings are automatically validated when an `EnricherSettings` instance is saved:

```python
# This will raise ValidationError if settings don't match schema
settings = EnricherSettings.objects.create(
    enricher_type="MyEnricher",
    settings={
        "timeout": "invalid"  # ERROR: IntegerField expects int, not str
    }
)
```

Custom validation:

```python
class MyEnricher(BaseEnricher):
    display_name = "My Enricher"

    settings_fields = {
        "port": models.IntegerField(default=443)
    }

    @classmethod
    def validate_settings(cls, settings_data):
        """
        Override to add custom validation logic.
        """
        errors = super().validate_settings(settings_data)

        # Custom validation
        port = settings_data.get("port")
        if port and (port < 1 or port > 65535):
            errors["port"] = "Port must be between 1 and 65535"

        return errors
```

### Default Settings

```python
from intelio.models import EnricherSettings

# Get default settings for your enricher
defaults = MyEnricher.get_default_settings()
# Returns: {"api_url": "https://api.example.com", "timeout": 30, ...}

# Create settings with defaults
settings = EnricherSettings.objects.create(
    enricher_type="MyEnricher",
    settings=MyEnricher.get_default_settings(),
    enabled=True
)
```

---

## Testing Your Enricher

### Unit Testing

Create tests in `intelio/tests/test_enrichments.py`:

```python
from django.test import TestCase
from entries.models import Entry, EntryClass, Relation
from entries.enums import EntryType, RelationReason
from intelio.models import EnricherSettings, EnrichmentRequest
from intelio.models.enrichments.my_enricher import MyCustomEnricher


class MyCustomEnricherTestCase(TestCase):
    def setUp(self):
        """Set up test fixtures"""
        # Create entry classes
        self.domain_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="domain"
        )
        self.ip_class = EntryClass.objects.create(
            type=EntryType.ARTIFACT,
            subtype="ip"
        )

        # Create test entries
        self.test_domain = Entry.objects.create(
            entry_class=self.domain_class,
            name="test.example.com"
        )

        # Create enricher settings
        self.settings = EnricherSettings.objects.create(
            enricher_type="MyCustomEnricher",
            enabled=True,
            settings={
                "api_key": "test-key",
                "timeout": 10
            }
        )
        self.settings.for_eclasses.add(self.domain_class)

        # Create enrichment request
        self.request = EnrichmentRequest.objects.create(
            title="Test Enrichment",
            request=[{
                "entry_class": "domain",
                "name": "test.example.com"
            }],
            user=None
        )
        self.request.enrichers_settings.add(self.settings)

    def test_enricher_initialization(self):
        """Test enricher can be instantiated"""
        enricher = MyCustomEnricher(
            settings=self.settings.settings,
            request=self.request
        )
        self.assertEqual(enricher.display_name, "My Custom Enricher")

    def test_pre_enrich_validation(self):
        """Test pre-enrichment validation"""
        enricher = MyCustomEnricher(
            settings=self.settings.settings,
            request=self.request
        )
        error = enricher.pre_enrich([self.test_domain])
        self.assertIsNone(error)

    def test_pre_enrich_missing_api_key(self):
        """Test validation fails without API key"""
        enricher = MyCustomEnricher(
            settings={"timeout": 10},  # Missing api_key
            request=self.request
        )
        error = enricher.pre_enrich([self.test_domain])
        self.assertIsNotNone(error)
        self.assertIn("API key", error)

    def test_enrich_creates_relations(self):
        """Test enrichment creates expected relations"""
        enricher = MyCustomEnricher(
            settings=self.settings.settings,
            request=self.request
        )

        # Run enrichment
        enricher.enrich([self.test_domain])

        # Check relations were created
        relations = Relation.objects.filter(
            reason=RelationReason.ENRICHMENT,
            reason_context="MyCustomEnricher"
        )
        self.assertGreater(relations.count(), 0)

    def test_enrich_handles_errors(self):
        """Test enricher handles errors gracefully"""
        # Configure with invalid settings to trigger error
        enricher = MyCustomEnricher(
            settings={"api_key": "invalid", "timeout": 1},
            request=self.request
        )

        # Should not raise exception
        enricher.enrich([self.test_domain])

        # Check warnings were logged
        self.assertGreater(len(self.request.warnings), 0)
```

### Integration Testing

Test via API:

```bash
# Create enrichment request
curl -X POST http://localhost:8000/api/enrichment/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test MyCustomEnricher",
    "enricher_name": "My Custom Enricher",
    "request": [
      {"entry_class": "domain", "name": "example.com"}
    ]
  }'

# Check status
curl http://localhost:8000/api/enrichment/{request_id}/ \
  -H "Authorization: Bearer $TOKEN"

# View results
curl http://localhost:8000/api/enrichment/{request_id}/relations/MyCustomEnricher/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## Porting from IntelOwl

If you have existing IntelOwl analyzers, this section will guide you through porting them to the CRADLE enrichment system. The two systems share similar concepts but differ in architecture and implementation details.

### Architecture Comparison

| IntelOwl | CRADLE Enrichment | Notes |
|----------|-------------------|-------|
| `ObservableAnalyzer` | `BaseEnricher` | Base class for analyzers/enrichers |
| `observable_name` | `entry.name` | The artifact being analyzed |
| `observable_classification` | `entry.entry_class` | Type of artifact (IP, domain, hash, etc.) |
| `run()` | `enrich(entries)` | Main execution method |
| `config()` | `settings_fields` | Configuration schema |
| `_api_key_name` | `settings["api_key"]` | API credentials |
| `AnalyzerReport` | `Relation` | Storage of results |
| Job-based execution | Request-based execution | Different orchestration models |

### Key Differences

#### 1. **Batch vs Single Processing**

**IntelOwl**: Processes one observable per analyzer run
```python
# IntelOwl
class MyAnalyzer(ObservableAnalyzer):
    def run(self):
        # Process self.observable_name
        result = api_call(self.observable_name)
        return result
```

**CRADLE**: Processes multiple entries in batch
```python
# CRADLE
class MyEnricher(BaseEnricher):
    def enrich(self, entries: list[Entry]) -> None:
        # Process all entries
        for entry in entries:
            result = api_call(entry.name)
            # Create relations
```

#### 2. **Result Storage**

**IntelOwl**: Returns dict stored in AnalyzerReport
```python
def run(self):
    return {
        "reputation_score": 85,
        "categories": ["malware", "botnet"]
    }
```

**CRADLE**: Creates Relation objects with details
```python
def enrich(self, entries: list[Entry]) -> None:
    relation = Relation.objects.create(
        e1=entry,
        e2=self.request.entry,
        reason=RelationReason.ENRICHMENT,
        reason_context=self.name,
        content_object=self.request,
        access_vector=self.request.access_vector,
        details={
            "reputation_score": 85,
            "categories": ["malware", "botnet"]
        }
    )
```

#### 3. **Configuration**

**IntelOwl**: Class attributes + runtime config
```python
class MyAnalyzer(ObservableAnalyzer):
    _api_key_name: str
    max_age: int
    verbose: bool

    def config(self, runtime_configuration: Dict):
        super().config(runtime_configuration)
        # Access via self._api_key_name, self.max_age, etc.
```

**CRADLE**: Django model fields in settings_fields
```python
class MyEnricher(BaseEnricher):
    settings_fields = {
        "api_key": models.CharField(max_length=255),
        "max_age": models.IntegerField(default=90),
        "verbose": models.BooleanField(default=False)
    }

    def enrich(self, entries):
        # Access via self.settings["api_key"], etc.
```

### Step-by-Step Porting Guide

#### Step 1: Analyze Your IntelOwl Analyzer

Identify these components in your IntelOwl analyzer:
1. **Configuration parameters** (class attributes)
2. **API endpoints and methods** (in `run()`)
3. **Result structure** (return value)
4. **Error handling** (exceptions raised)
5. **Observable types supported** (IP, domain, hash, URL)

#### Step 2: Create CRADLE Enricher Skeleton

Map IntelOwl components to CRADLE:

```python
# IntelOwl: api_app/analyzers_manager/observable_analyzers/abuseipdb.py
class AbuseIPDB(ObservableAnalyzer):
    url: str = "https://api.abuseipdb.com/api/v2/check"
    _api_key_name: str
    max_age: int
    max_reports: int
    verbose: bool

    def run(self):
        headers = {"Key": self._api_key_name, "Accept": "application/json"}
        params_ = {
            "ipAddress": self.observable_name,
            "maxAgeInDays": self.max_age,
            "verbose": self.verbose,
        }
        response = requests.get(self.url, params=params_, headers=headers)
        response.raise_for_status()
        result = response.json()
        # ... process result ...
        return result
```

**Becomes:**

```python
# CRADLE: intelio/models/enrichments/abuseipdb.py
from django.db import models
from entries.models import Entry, Relation
from entries.enums import RelationReason
from ..base import BaseEnricher
import requests


class AbuseIPDBEnricher(BaseEnricher):
    display_name = "AbuseIPDB"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="AbuseIPDB API key"
        ),
        "max_age": models.IntegerField(
            default=90,
            help_text="Maximum age of reports in days"
        ),
        "max_reports": models.IntegerField(
            default=100,
            help_text="Maximum number of reports to include"
        ),
        "verbose": models.BooleanField(
            default=False,
            help_text="Include detailed report information"
        ),
    }

    API_URL = "https://api.abuseipdb.com/api/v2/check"

    def pre_enrich(self, entries: list[Entry]):
        if not self.settings.get("api_key"):
            return "AbuseIPDB API key is required"
        return None

    def enrich(self, entries: list[Entry]) -> None:
        api_key = self.settings["api_key"]
        max_age = self.settings.get("max_age", 90)
        max_reports = self.settings.get("max_reports", 100)
        verbose = self.settings.get("verbose", False)

        enrichment_entry = self.request.entry
        relations = []

        for entry in entries:
            try:
                # Make API call (same as IntelOwl)
                headers = {"Key": api_key, "Accept": "application/json"}
                params = {
                    "ipAddress": entry.name,  # observable_name → entry.name
                    "maxAgeInDays": max_age,
                    "verbose": verbose,
                }
                response = requests.get(self.API_URL, params=params, headers=headers)
                response.raise_for_status()

                result = response.json()

                # Process result (keep IntelOwl logic)
                reports = result.get("data", {}).get("reports", [])
                categories_found = self._process_reports(reports)

                # Store as relation instead of returning
                relation = Relation(
                    e1=entry,
                    e2=enrichment_entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    inherit_av=True,
                    details={
                        "abuse_confidence_score": result.get("data", {}).get("abuseConfidenceScore", 0),
                        "total_reports": result.get("data", {}).get("totalReports", 0),
                        "is_whitelisted": result.get("data", {}).get("isWhitelisted", False),
                        "categories_found": categories_found,
                        "reports": reports[:max_reports],
                        "permalink": f"https://www.abuseipdb.com/check/{entry.name}"
                    }
                )
                relations.append(relation)

            except requests.RequestException as e:
                self.request._append_warning(
                    f"AbuseIPDB API failed for {entry.name}: {str(e)}"
                )

        # Bulk create relations
        if relations:
            Relation.objects.bulk_create(relations)

    def _process_reports(self, reports):
        """Keep IntelOwl helper methods as-is"""
        mapping = self._get_mapping()
        categories_found = {}
        for report in reports:
            for category in report.get("categories", []):
                category_name = mapping.get(category, "unknown category")
                categories_found[category_name] = categories_found.get(category_name, 0) + 1
        return categories_found

    @staticmethod
    def _get_mapping():
        """Keep IntelOwl mapping logic unchanged"""
        return {
            1: "DNS Compromise",
            2: "DNS Poisoning",
            # ... rest of mapping ...
        }
```

#### Step 3: Adapt Observable Classification

IntelOwl uses `observable_classification` to determine artifact type. CRADLE uses `EntryClass`:

**IntelOwl**:
```python
if self.observable_classification == Classification.URL:
    domain = urlparse(self.observable_name).hostname
elif self.observable_classification == Classification.DOMAIN:
    domain = self.observable_name
```

**CRADLE**:
```python
for entry in entries:
    # Entry class filtering is done by the task runner
    # All entries here match configured entry classes

    if entry.entry_class.subtype == "url":
        domain = urlparse(entry.name).hostname
    elif entry.entry_class.subtype == "domain":
        domain = entry.name
```

Or use `EnricherSettings.for_eclasses` to specify supported types and let the system filter:

```python
# Configuration (via admin or API)
enricher_settings = EnricherSettings.objects.create(
    enricher_type="MyEnricher",
    settings={"api_key": "..."}
)

# Only process domains and URLs
domain_class = EntryClass.objects.get(subtype="domain")
url_class = EntryClass.objects.get(subtype="url")
enricher_settings.for_eclasses.add(domain_class, url_class)
```

#### Step 4: Handle Hash-Based Analyzers

**IntelOwl**: Uses `run_hash` configuration
```python
class MyHashAnalyzer(ObservableAnalyzer):
    def config(self, runtime_configuration):
        super().config(runtime_configuration)
        if self._config.run_hash:
            if self._config.run_hash_type == HashChoices.SHA256:
                self.observable_name = self._job.analyzable.sha256
            else:
                self.observable_name = self._job.analyzable.md5
```

**CRADLE**: Entry name contains the hash
```python
class MyHashEnricher(BaseEnricher):
    display_name = "My Hash Enricher"

    settings_fields = {
        "hash_type": models.CharField(
            max_length=20,
            default="sha256",
            choices=[
                ("md5", "MD5"),
                ("sha1", "SHA1"),
                ("sha256", "SHA256")
            ]
        )
    }

    def enrich(self, entries: list[Entry]):
        for entry in entries:
            # entry.name contains the hash value
            file_hash = entry.name
            hash_type = self._detect_hash_type(file_hash)

            result = self._query_api(file_hash, hash_type)
            # ... create relations ...

    def _detect_hash_type(self, hash_string: str):
        length = len(hash_string)
        if length == 32:
            return "md5"
        elif length == 40:
            return "sha1"
        elif length == 64:
            return "sha256"
        return None
```

#### Step 5: Convert Error Handling

**IntelOwl**: Raises exceptions
```python
def run(self):
    if not self._api_key_name:
        raise AnalyzerConfigurationException("API key required")

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        raise AnalyzerRunException(f"API call failed: {e}")
```

**CRADLE**: Uses pre_enrich + warnings
```python
def pre_enrich(self, entries):
    if not self.settings.get("api_key"):
        return "API key is required"  # Fatal error
    return None

def enrich(self, entries):
    for entry in entries:
        try:
            response = requests.get(url)
            response.raise_for_status()
        except requests.RequestException as e:
            # Non-fatal: log warning and continue
            self.request._append_warning(
                f"API call failed for {entry.name}: {e}"
            )
            continue
```

#### Step 6: Map Data Model Updates

IntelOwl's `_update_data_model()` method doesn't have a direct equivalent. Store this data in Relation details:

**IntelOwl**:
```python
def _update_data_model(self, data_model):
    super()._update_data_model(data_model)
    if self.report.report.get("data", {}).get("isWhitelisted"):
        data_model.evaluation = self.EVALUATIONS.TRUSTED.value
    else:
        data_model.evaluation = self.EVALUATIONS.MALICIOUS.value
```

**CRADLE**: Include in relation details
```python
def enrich(self, entries):
    for entry in entries:
        result = self._query_api(entry.name)

        # Determine evaluation
        is_whitelisted = result.get("data", {}).get("isWhitelisted", False)
        evaluation = "trusted" if is_whitelisted else "malicious"

        relation = Relation(
            e1=entry,
            e2=self.request.entry,
            reason=RelationReason.ENRICHMENT,
            reason_context=self.name,
            content_object=self.request,
            access_vector=self.request.access_vector,
            details={
                "evaluation": evaluation,
                "is_whitelisted": is_whitelisted,
                "raw_result": result
            }
        )
```

### Common Porting Patterns

#### Pattern 1: Simple REST API Analyzer

**IntelOwl**:
```python
class SimpleAPIAnalyzer(ObservableAnalyzer):
    _api_key_name: str

    def run(self):
        response = requests.get(
            "https://api.example.com/lookup",
            params={"query": self.observable_name},
            headers={"Authorization": f"Bearer {self._api_key_name}"}
        )
        return response.json()
```

**CRADLE**:
```python
class SimpleAPIEnricher(BaseEnricher):
    display_name = "Simple API"
    settings_fields = {
        "api_key": models.CharField(max_length=255)
    }

    def enrich(self, entries: list[Entry]):
        api_key = self.settings["api_key"]
        relations = []

        for entry in entries:
            try:
                response = requests.get(
                    "https://api.example.com/lookup",
                    params={"query": entry.name},
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                response.raise_for_status()

                relations.append(Relation(
                    e1=entry,
                    e2=self.request.entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    details=response.json()
                ))
            except Exception as e:
                self.request._append_warning(f"Failed {entry.name}: {e}")

        Relation.objects.bulk_create(relations)
```

#### Pattern 2: DNS Lookup Analyzer

**IntelOwl**:
```python
class CIRCL_PDNS(ObservableAnalyzer):
    _pdns_credentials: str

    def run(self):
        user, pwd = self._pdns_credentials.split("|")
        pdns = pypdns.PyPDNS(basic_auth=(user, pwd))
        result = pdns.query(self.observable_name)
        return result
```

**CRADLE**:
```python
class CIRCLPDNSEnricher(BaseEnricher):
    display_name = "CIRCL PDNS"
    settings_fields = {
        "username": models.CharField(max_length=255),
        "password": models.CharField(max_length=255)
    }

    def enrich(self, entries: list[Entry]):
        user = self.settings["username"]
        pwd = self.settings["password"]
        pdns = pypdns.PyPDNS(basic_auth=(user, pwd))

        for entry in entries:
            try:
                results = pdns.query(entry.name)

                # Create relation for each DNS record found
                for record in results:
                    # Get or create IP entry
                    ip_class = EntryClass.objects.get(subtype="ip")
                    ip_entry, _ = Entry.objects.get_or_create(
                        entry_class=ip_class,
                        name=record.get("rdata")
                    )

                    Relation.objects.create(
                        e1=entry,
                        e2=ip_entry,
                        reason=RelationReason.ENRICHMENT,
                        reason_context=self.name,
                        content_object=self.request,
                        access_vector=self.request.access_vector,
                        details={
                            "record_type": record.get("rrtype"),
                            "time_first": record.get("time_first"),
                            "time_last": record.get("time_last")
                        }
                    )
            except Exception as e:
                self.request._append_warning(f"PDNS lookup failed for {entry.name}: {e}")
```

#### Pattern 3: BasicObservableAnalyzer (Generic REST)

IntelOwl's `BasicObservableAnalyzer` is a generic REST client. Port it as a base class:

```python
class BasicRESTEnricher(BaseEnricher):
    """
    Generic REST API enricher.
    Subclass and set class attributes.
    """

    settings_fields = {
        "api_key": models.CharField(max_length=255, blank=True),
        "timeout": models.IntegerField(default=30)
    }

    # Override in subclass
    API_URL = None
    HTTP_METHOD = "GET"
    HEADERS = {}
    PARAMS = {}

    def enrich(self, entries: list[Entry]):
        if not self.API_URL:
            raise ValueError("API_URL must be set in subclass")

        api_key = self.settings.get("api_key", "")
        timeout = self.settings.get("timeout", 30)

        # Prepare headers
        headers = self.HEADERS.copy()
        for key, value in headers.items():
            headers[key] = value.replace("<api_key>", api_key)

        relations = []

        for entry in entries:
            try:
                # Prepare params
                params = self.PARAMS.copy()
                for key, value in params.items():
                    if value == "<observable>":
                        params[key] = entry.name

                # Make request
                if self.HTTP_METHOD.lower() == "get":
                    response = requests.get(
                        self.API_URL,
                        params=params,
                        headers=headers,
                        timeout=timeout
                    )
                else:
                    response = requests.request(
                        self.HTTP_METHOD,
                        self.API_URL,
                        json=params,
                        headers=headers,
                        timeout=timeout
                    )

                response.raise_for_status()

                relations.append(Relation(
                    e1=entry,
                    e2=self.request.entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    details=response.json()
                ))
            except Exception as e:
                self.request._append_warning(f"Request failed for {entry.name}: {e}")

        Relation.objects.bulk_create(relations)


# Usage: Create specific enricher by setting class attributes
class MyServiceEnricher(BasicRESTEnricher):
    display_name = "My Service"
    API_URL = "https://api.myservice.com/lookup"
    HEADERS = {"Authorization": "Bearer <api_key>"}
    PARAMS = {"query": "<observable>", "details": "true"}
```

### Testing Your Port

After porting, verify functionality:

```python
# Test in Django shell
from intelio.models import EnricherSettings, EnrichmentRequest
from entries.models import Entry, EntryClass

# Create settings
settings = EnricherSettings.objects.create(
    enricher_type="AbuseIPDBEnricher",
    enabled=True,
    settings={"api_key": "your-key", "max_age": 90}
)

ip_class = EntryClass.objects.get(subtype="ip")
settings.for_eclasses.add(ip_class)

# Create enrichment request
request = EnrichmentRequest.objects.create(
    title="Test AbuseIPDB Port",
    request=[{"entry_class": "ip", "name": "8.8.8.8"}],
    user=None
)
request.enrichers_settings.add(settings)

# Check results after task completes
request.relations.all()  # Should show relations
request.errors  # Should be empty
request.warnings  # May contain warnings
```

### Porting Checklist

- [ ] Identify IntelOwl analyzer to port
- [ ] Map configuration attributes to `settings_fields`
- [ ] Convert `run()` single-observable logic to `enrich()` batch processing
- [ ] Change return statements to `Relation.objects.create()`
- [ ] Convert exceptions to warnings (non-fatal) or `pre_enrich()` errors (fatal)
- [ ] Update observable references: `self.observable_name` → `entry.name`
- [ ] Update classification checks: `self.observable_classification` → `entry.entry_class.subtype`
- [ ] Move helper methods as-is (no changes needed)
- [ ] Test with sample data
- [ ] Create migration and add to `__init__.py`
- [ ] Configure `EnricherSettings` with API keys
- [ ] Document `details` schema in docstring

### Reference: Side-by-Side Comparison

```python
# ============================================================
# INTELOWL: api_app/analyzers_manager/observable_analyzers/example.py
# ============================================================
class ExampleAnalyzer(ObservableAnalyzer):
    """Analyzes observables using Example API"""

    _api_key_name: str  # From secrets
    timeout: int        # From config

    def config(self, runtime_configuration: Dict):
        super().config(runtime_configuration)
        # Additional initialization

    def run(self):
        """Process single observable"""
        # Validate
        if not self._api_key_name:
            raise AnalyzerConfigurationException("API key required")

        # Call API
        try:
            response = requests.get(
                "https://api.example.com/check",
                params={"query": self.observable_name},
                headers={"X-API-Key": self._api_key_name},
                timeout=self.timeout
            )
            response.raise_for_status()
        except requests.RequestException as e:
            raise AnalyzerRunException(f"API failed: {e}")

        # Return results (stored in AnalyzerReport)
        return response.json()


# ============================================================
# CRADLE: intelio/models/enrichments/example.py
# ============================================================
from django.db import models
from entries.models import Entry, Relation
from entries.enums import RelationReason
from ..base import BaseEnricher
import requests


class ExampleEnricher(BaseEnricher):
    """Enriches entries using Example API"""

    display_name = "Example"

    settings_fields = {
        "api_key": models.CharField(max_length=255),
        "timeout": models.IntegerField(default=30)
    }

    def pre_enrich(self, entries: list[Entry]):
        """Validate before processing"""
        if not self.settings.get("api_key"):
            return "API key is required"
        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Process multiple entries"""
        api_key = self.settings["api_key"]
        timeout = self.settings.get("timeout", 30)

        relations = []

        for entry in entries:
            try:
                # Call API (same logic as IntelOwl)
                response = requests.get(
                    "https://api.example.com/check",
                    params={"query": entry.name},  # observable_name → entry.name
                    headers={"X-API-Key": api_key},
                    timeout=timeout
                )
                response.raise_for_status()

                # Create relation (instead of return)
                relations.append(Relation(
                    e1=entry,
                    e2=self.request.entry,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    details=response.json()  # Store API response
                ))

            except requests.RequestException as e:
                # Non-fatal: continue processing other entries
                self.request._append_warning(
                    f"API failed for {entry.name}: {e}"
                )

        # Bulk create all relations
        if relations:
            Relation.objects.bulk_create(relations)
```

### Additional Resources

- **IntelOwl Analyzer Reference**: `/IntelOwl/api_app/analyzers_manager/`
- **CRADLE Enricher Examples**: `intelio/models/enrichments/dns.py`
- **IntelOwl Documentation**: Check existing analyzer configs in migration files
- **Entry Classes**: View available types via Django admin or `EntryClass.objects.all()`

---

## Best Practices

### Performance

1. **Bulk operations**: Use `bulk_create()` for Relations
   ```python
   relations = []
   for entry in entries:
       # Build relations list
       relations.append(Relation(...))

   # Single database call
   Relation.objects.bulk_create(relations)
   ```

2. **Deduplication**: Use `get_or_create()` for Entries to avoid duplicates
   ```python
   entry, created = Entry.objects.get_or_create(
       entry_class=ip_class,
       name="1.2.3.4"
   )
   ```

3. **Batch external API calls**: Reduce API requests when possible
   ```python
   # Good: Batch request
   results = api.lookup_batch([e.name for e in entries])

   # Bad: Individual requests
   for entry in entries:
       result = api.lookup(entry.name)
   ```

4. **Timeout handling**: Respect timeout settings
   ```python
   import requests

   timeout = self.settings.get("timeout", 30)
   response = requests.get(url, timeout=timeout)
   ```

### Error Handling

1. **Use warnings for non-critical errors**: Don't fail entire job for one entry
   ```python
   for entry in entries:
       try:
           self._process(entry)
       except Exception as e:
           self.request._append_warning(f"Failed {entry.name}: {e}")
   ```

2. **Validate early**: Use `pre_enrich()` to catch config issues before processing
   ```python
   def pre_enrich(self, entries):
       if not self._test_connection():
           return "Cannot connect to API"
       return None
   ```

3. **Provide helpful error messages**: Include context in warnings
   ```python
   self.request._append_warning(
       f"Rate limit exceeded for {entry.name}. "
       f"Tried {retry_count} times. Consider increasing timeout."
   )
   ```

### Documentation

1. **Document your settings schema**:
   ```python
   settings_fields = {
       "api_key": models.CharField(
           max_length=255,
           help_text="Get your API key from https://example.com/api"
       )
   }
   ```

2. **Document your details schema** in docstrings:
   ```python
   def enrich(self, entries):
       """
       Enriches entries with geolocation data.

       Creates relations with details schema:
       {
           "country_code": str,      # ISO 3166-1 alpha-2
           "city": str,              # City name
           "latitude": float,        # Decimal degrees
           "longitude": float,       # Decimal degrees
           "accuracy_radius": int    # Kilometers
       }
       """
   ```

3. **Add class docstring**:
   ```python
   class GeoIPEnricher(BaseEnricher):
       """
       Enriches IP addresses with geographic location data.

       Supported entry classes:
       - ip (IPv4 addresses)
       - ipv6 (IPv6 addresses)

       Creates relations to 'location' entry class.

       External dependencies:
       - MaxMind GeoIP2 database

       Rate limits:
       - 1000 requests/hour (configurable)
       """
   ```

### Security

1. **Validate external data**: Don't trust external APIs
   ```python
   def _validate_ip(self, ip_string):
       try:
           ipaddress.ip_address(ip_string)
           return True
       except ValueError:
           return False
   ```

2. **Use environment variables for secrets**: Don't hardcode API keys
   ```python
   import os

   # In settings configuration
   default_api_key = os.environ.get("MY_ENRICHER_API_KEY", "")
   ```

3. **Sanitize entry names**: Prevent injection attacks
   ```python
   import re

   def _sanitize_domain(self, domain):
       # Remove dangerous characters
       return re.sub(r'[^\w\.-]', '', domain)
   ```

### Maintainability

1. **Keep enrichers focused**: One enricher = one data source/technique
2. **Extract helpers**: Move complex logic to private methods
3. **Log appropriately**: Use warnings for visibility
   ```python
   import logging

   logger = logging.getLogger(__name__)

   def enrich(self, entries):
       logger.info(f"Starting enrichment of {len(entries)} entries")
       # ...
   ```

4. **Version your external APIs**: Handle API version changes gracefully
   ```python
   settings_fields = {
       "api_version": models.CharField(
           default="v2",
           choices=[("v1", "Version 1"), ("v2", "Version 2")]
       )
   }
   ```

---

## Complete Example: VirusTotal Enricher

Here's a complete, production-ready example:

```python
# intelio/models/enrichments/virustotal.py

import requests
from typing import Optional
from django.db import models
from entries.enums import RelationReason
from entries.models import Entry, EntryClass, Relation
from ..base import BaseEnricher


class VirusTotalEnricher(BaseEnricher):
    """
    Enriches file hashes with VirusTotal scan results.

    Supported entry classes:
    - hash (MD5, SHA1, SHA256)

    Creates relations to EnrichmentRequest.entry with detection metadata.

    API Documentation: https://developers.virustotal.com/reference
    Rate Limit: 4 requests/minute (free tier)

    Relation details schema:
    {
        "hash_type": "sha256" | "md5" | "sha1",
        "detections": int,           # Number of AV engines detecting malware
        "total_engines": int,        # Total engines that scanned
        "scan_date": str,            # ISO 8601 timestamp
        "positives": [               # List of detections
            {
                "engine": str,
                "result": str
            }
        ],
        "permalink": str             # VirusTotal report URL
    }
    """

    display_name = "VirusTotal"

    settings_fields = {
        "api_key": models.CharField(
            max_length=255,
            help_text="VirusTotal API key (get from https://www.virustotal.com/gui/my-apikey)"
        ),
        "timeout": models.IntegerField(
            default=30,
            help_text="API request timeout in seconds"
        ),
        "min_detections": models.IntegerField(
            default=1,
            help_text="Minimum detections to create relation (0 = always create)"
        ),
    }

    VT_API_URL = "https://www.virustotal.com/vtapi/v2/file/report"

    def pre_enrich(self, entries: list[Entry]) -> Optional[str]:
        """Validate configuration before starting."""
        # Check API key
        api_key = self.settings.get("api_key")
        if not api_key:
            return "VirusTotal API key is required"

        # Test API connectivity
        if not self._test_api_connection(api_key):
            return "Cannot connect to VirusTotal API. Check API key and network."

        # Validate entries
        if not entries:
            return "No entries provided for enrichment"

        return None

    def enrich(self, entries: list[Entry]) -> None:
        """Perform VirusTotal enrichment."""
        api_key = self.settings["api_key"]
        timeout = self.settings.get("timeout", 30)
        min_detections = self.settings.get("min_detections", 1)

        # Get enrichment entry for non-relational results
        enrichment_entry = self.request.entry

        relations_to_create = []

        for entry in entries:
            try:
                # Determine hash type
                hash_type = self._detect_hash_type(entry.name)
                if not hash_type:
                    self.request._append_warning(
                        f"Could not determine hash type for {entry.name}"
                    )
                    continue

                # Query VirusTotal
                result = self._query_virustotal(entry.name, api_key, timeout)

                if result is None:
                    self.request._append_warning(
                        f"No VirusTotal data found for {entry.name}"
                    )
                    continue

                # Check minimum detections threshold
                detections = result.get("positives", 0)
                if detections < min_detections:
                    continue

                # Build relation details
                details = {
                    "hash_type": hash_type,
                    "detections": detections,
                    "total_engines": result.get("total", 0),
                    "scan_date": result.get("scan_date", ""),
                    "positives": self._extract_positives(result),
                    "permalink": result.get("permalink", "")
                }

                # Create relation to enrichment entry
                relation = Relation(
                    e1=entry,
                    e2=enrichment_entry,
                    inherit_av=True,
                    content_object=self.request,
                    access_vector=self.request.access_vector,
                    reason=RelationReason.ENRICHMENT,
                    reason_context=self.name,
                    details=details
                )
                relations_to_create.append(relation)

            except requests.RequestException as e:
                self.request._append_warning(
                    f"API request failed for {entry.name}: {str(e)}"
                )
            except Exception as e:
                self.request._append_warning(
                    f"Unexpected error enriching {entry.name}: {str(e)}"
                )

        # Bulk create all relations
        if relations_to_create:
            Relation.objects.bulk_create(relations_to_create)

    def _test_api_connection(self, api_key: str) -> bool:
        """Test VirusTotal API connectivity."""
        try:
            response = requests.get(
                self.VT_API_URL,
                params={
                    "apikey": api_key,
                    "resource": "0" * 64  # Dummy hash
                },
                timeout=5
            )
            return response.status_code in [200, 404]  # 404 = valid API, hash not found
        except:
            return False

    def _query_virustotal(self, file_hash: str, api_key: str, timeout: int):
        """Query VirusTotal for file hash."""
        response = requests.get(
            self.VT_API_URL,
            params={
                "apikey": api_key,
                "resource": file_hash
            },
            timeout=timeout
        )
        response.raise_for_status()

        data = response.json()
        if data.get("response_code") != 1:
            return None

        return data

    def _detect_hash_type(self, hash_string: str) -> Optional[str]:
        """Detect hash type from string length."""
        length = len(hash_string)
        if length == 32:
            return "md5"
        elif length == 40:
            return "sha1"
        elif length == 64:
            return "sha256"
        return None

    def _extract_positives(self, result: dict) -> list:
        """Extract positive detections from scan results."""
        positives = []
        scans = result.get("scans", {})

        for engine, scan_result in scans.items():
            if scan_result.get("detected"):
                positives.append({
                    "engine": engine,
                    "result": scan_result.get("result", "")
                })

        return positives[:10]  # Limit to top 10 to reduce data size
```

---

## Summary

You now have everything needed to develop custom enrichers:

1. **Create** a subclass of `BaseEnricher`
2. **Define** settings schema with `settings_fields`
3. **Implement** `pre_enrich()` for validation
4. **Implement** `enrich()` for processing
5. **Store** results as `Relation` objects
6. **Handle** errors with warnings and exceptions
7. **Use** `ClassMapping` for external type systems
8. **Test** thoroughly with unit and integration tests
9. **Document** your settings and details schema
10. **Follow** best practices for performance and security

For questions or assistance, consult the existing enrichers in `intelio/models/enrichments/` or reach out to the development team.

Happy enriching! 🚀
