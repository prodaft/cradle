# Enricher Containers

Each subdirectory is a self-contained Docker image for one enricher. The Celery
worker bind-mounts the job JSON read-only at **`/job.json`**; for local testing
you can pipe JSON on **stdin** instead. The process writes the result JSON to
**stdout**. There is **no** database connection and no Django inside the image
(the worker supplies only the job file mount).

## Directory Structure

```
enrichers/
  _base/
    enricher_base.py   # Shared job load (/job.json or stdin) + stdout harness
  dns/
    enricher.py        # Pure Python enrichment logic
    pyproject.toml     # Dependencies for the container image
    Dockerfile
  virustotal/
    ...
  abuseipdb/
    ...
  circl_pdns/
    ...
  misp/
    ...
  mwdb/
    ...
  opencti/
    ...
  urlscan/
    ...
  build.sh             # Build all images
```

## Building Images

```bash
# Build all enrichers (from the enrichers/ directory)
./build.sh

# Build specific enrichers
./build.sh dns virustotal

# Use a custom registry prefix
IMAGE_PREFIX=myregistry.example.com/cradle/enricher ./build.sh
```

Images are tagged as `<IMAGE_PREFIX>/<build_name>enricher:latest` (see
`build.sh`). The backend uses `ENRICHER_DOCKER_IMAGE_PREFIX/<slug>` where
`slug` matches that tag except for class-name quirks (`DNSEnricher` →
`dnsenricher`, `CIRCLPDNSEnricher` → `circl_pdnsenricher`); see
`intelio/runner/docker_runner.py` (`_DOCKER_IMAGE_SLUG_OVERRIDES`).

## Configuration

Container isolation is always on. Tunable via `.env`:

```
ENRICHER_DOCKER_IMAGE_PREFIX=cradle/enricher
ENRICHER_MEM_LIMIT=256m
ENRICHER_CPU_QUOTA=50000
ENRICHER_TIMEOUT=120
ENRICHER_EXTERNAL_NETWORK=enricher_external
```

## Job / Result Contract

**Job payload** (file `/job.json` in production, or stdin when testing):
```json
{
  "enricher_type": "VirusTotalEnricher",
  "settings": {"api_key": "...", "timeout": 30},
  "entries": [{"name": "abc123...", "entry_class": "hash"}],
  "enrichment_entry": {"name": "Enrichment Request ...", "entry_class": "__enrichment__"},
  "dns_typemapping": {"A": "ip", "AAAA": "ipv6"}
}
```

**Stdout (result)**:
```json
{
  "relations": [
    {
      "e1_name": "abc123...",
      "e1_class": "hash",
      "e2_name": "Enrichment Request ...",
      "e2_class": "__enrichment__",
      "details": {"detections": 5},
      "inherit_av": true
    }
  ],
  "warnings": [],
  "errors": []
}
```

## Network Policy

| Enricher | Network | Reason |
|---|---|---|
| DNS | `enricher_external` | Needs outbound UDP/TCP 53 |
| VirusTotal | `enricher_external` | Needs HTTPS to virustotal.com |
| AbuseIPDB | `enricher_external` | Needs HTTPS to abuseipdb.com |
| CIRCL PDNS | `enricher_external` | Needs HTTPS to circl.lu |
| MISP | `enricher_external` | Needs HTTPS to MISP instance |
| MWDB | `enricher_external` | Needs HTTPS to MWDB instance |
| OpenCTI | `enricher_external` | Needs HTTPS to OpenCTI instance |
| URLScan | `enricher_external` | Needs HTTPS to urlscan.io |

Set `"network": "external"` in `EnricherSettings.settings` to use the external
network. The `enricher_external` Docker network is created automatically by the
worker on first use.

## Security Properties

- No `DATABASE_URL` or any Cradle secrets injected
- No volume mounts (read-only root filesystem)
- All Linux capabilities dropped (`--cap-drop ALL`)
- `--security-opt no-new-privileges:true`
- Memory and CPU limits enforced
- Container is removed after exit (`--rm`)
- Runs as non-root user `enricher`
