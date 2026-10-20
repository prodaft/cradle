"""MWDB enricher container.

Queries MWDB (mwdb.cert.pl) for file hash metadata and related hashes.
MWDB type mappings are passed in the job payload (no DB access).
Network requirement: external (needs outbound HTTPS to mwdb instance).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import mwdblib
import mwdblib.exc
from _base.enricher_base import enrichment_entry, main, make_relation


def enrich(job: dict) -> dict:
    """Process the job payload and return relations, warnings, and errors."""
    settings = job["settings"]
    entries = job["entries"]
    sentinel = enrichment_entry(job)
    # mwdb_typemapping: {mwdb_type_key: cradle_subtype}
    mwdb_typemapping: dict[str, str] = job.get("mwdb_typemapping") or {}

    api_key = settings.get("api_key", "")
    mwdb_url = settings.get("mwdb_url", "https://mwdb.cert.pl")
    extract_hashes = settings.get("extract_hashes", True)

    if not api_key:
        return {"relations": [], "warnings": [], "errors": ["Add your MWDB API key before running this enrichment."]}

    warnings = []
    relations = []

    if extract_hashes and not mwdb_typemapping:
        warnings.append(
            "No MWDB type mappings are configured. "
            "Related hash extraction will be disabled until an administrator adds them in the admin site."
        )

    try:
        mwdb = mwdblib.MWDB(api_url=mwdb_url, api_key=api_key)
    except Exception as exc:
        return {"relations": [], "warnings": [], "errors": [f"Could not connect to MWDB: {exc}"]}

    for entry in entries:
        try:
            result: dict = {}

            try:
                file_info = mwdb.query_file(entry["name"])
            except mwdblib.exc.ObjectNotFoundError:
                result["not_found"] = True
            except Exception as exc:
                warnings.append(f"MWDB query failed for {entry['name']}: {exc}")
                result["not_found"] = True
            else:
                result["data"] = file_info.data
                result["not_found"] = False
                try:
                    result["attributes"] = file_info.attributes
                except Exception:
                    warnings.append("Some details from the malware database could not be retrieved.")
                result["permalink"] = f"{mwdb_url}/file/{entry['name']}"

            relations.append(
                make_relation(
                    e1_name=entry["name"],
                    e1_class=entry["entry_class"],
                    e2_name=sentinel["name"],
                    e2_class=sentinel["entry_class"],
                    details=result,
                )
            )

            if extract_hashes and not result.get("not_found"):
                data = result.get("data", {})
                unmapped_types: list[str] = []

                for field in ["md5", "sha1", "sha256", "sha512"]:
                    hash_value = data.get(field)
                    if not hash_value or hash_value == entry["name"]:
                        continue
                    target_class = mwdb_typemapping.get(field)
                    if target_class:
                        relations.append(
                            make_relation(
                                e1_name=entry["name"],
                                e1_class=entry["entry_class"],
                                e2_name=hash_value,
                                e2_class=target_class,
                                details={
                                    "source": "mwdb_alternate_hash",
                                    "hash_type": field,
                                    "file_name": data.get("file_name", ""),
                                },
                            )
                        )
                    else:
                        unmapped_types.append(field)

                parent_class = mwdb_typemapping.get("parent")
                parents = data.get("parents", [])
                if parents and not parent_class:
                    unmapped_types.append("parent")

                if parent_class:
                    for parent in parents:
                        if isinstance(parent, dict):
                            parent_hash = parent.get("sha256") or parent.get("id")
                            if parent_hash:
                                relations.append(
                                    make_relation(
                                        e1_name=entry["name"],
                                        e1_class=entry["entry_class"],
                                        e2_name=parent_hash,
                                        e2_class=parent_class,
                                        details={"source": "mwdb_parent", "relationship": "parent"},
                                    )
                                )

                if unmapped_types:
                    warnings.append(
                        f"Some related artifact types were skipped because no mapping exists for them: "
                        f"{', '.join(unmapped_types)}. "
                        f"An administrator can add MWDB type mappings in the admin site."
                    )

        except Exception as exc:
            warnings.append(f"MWDB enrichment failed for {entry['name']}: {exc}")

    return {"relations": relations, "warnings": warnings, "errors": []}


if __name__ == "__main__":
    main(enrich)
