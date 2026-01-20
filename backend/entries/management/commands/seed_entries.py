import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from entries.models import EntryClass
from intelio.models.mappings.catalyst import CatalystMapping
from intelio.models.mappings.dns import DNSMapping
from intelio.models.mappings.falcon import FalconMapping
from intelio.models.mappings.misp import MISPMapping
from intelio.models.mappings.mwdb import MWDBMapping
from intelio.models.mappings.opencti import OpenCTIMapping
from intelio.models.mappings.urlscan import URLScanMapping


MAPPING_MODELS = {
    "catalyst": CatalystMapping,
    "dns": DNSMapping,
    "falcon": FalconMapping,
    "misp": MISPMapping,
    "mwdb": MWDBMapping,
    "opencti": OpenCTIMapping,
    "urlscan": URLScanMapping,
}


class Command(BaseCommand):
    help = "Seed the database with entry classes and type mappings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--populate-existing",
            action="store_true",
            help="Populate tables even when they are not empty.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing rows when they already exist.",
        )
        parser.add_argument(
            "--data-file",
            default=None,
            help="Optional path to a JSON seed file.",
        )

    def handle(self, *args, **options):
        populate_existing = options["populate_existing"] or options["overwrite"]
        overwrite = options["overwrite"]
        data_file = options["data_file"] or str(Path(__file__).with_name("entries_seed.json"))

        data = self._load_seed_data(data_file)
        entry_classes = data.get("entry_classes")
        if not isinstance(entry_classes, list):
            raise CommandError("Seed data must contain an 'entry_classes' list.")

        with transaction.atomic():
            self._seed_entry_classes(entry_classes, populate_existing, overwrite)
            self._seed_type_mappings(entry_classes, populate_existing, overwrite)

    def _load_seed_data(self, data_file):
        data_path = Path(data_file)
        if not data_path.exists():
            raise CommandError(f"Seed data file not found: {data_path}")
        try:
            return json.loads(data_path.read_text())
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in seed data file: {data_path}") from exc

    def _should_populate_table(self, model, populate_existing, overwrite):
        if populate_existing or overwrite:
            return True
        return not model.objects.exists()

    def _seed_entry_classes(self, entry_classes, populate_existing, overwrite):
        if not self._should_populate_table(EntryClass, populate_existing, overwrite):
            self.stdout.write("EntryClass table not empty; skipping entry class seed.")
            return

        children_map = {}
        update_children_for = set()

        for entry_data in entry_classes:
            if "subtype" not in entry_data:
                raise CommandError("Entry class data missing 'subtype'.")

            subtype = entry_data["subtype"]
            fields = dict(entry_data)
            fields.pop("subtype", None)
            children = fields.pop("children", [])
            fields.pop("type_mappings", None)
            timestamp = fields.pop("timestamp", None)

            if overwrite:
                _, created = EntryClass.objects.update_or_create(subtype=subtype, defaults=fields)
                update_children_for.add(subtype)
            else:
                _, created = EntryClass.objects.get_or_create(subtype=subtype, defaults=fields)
                if created:
                    update_children_for.add(subtype)

            if timestamp and (overwrite or created):
                parsed = parse_datetime(timestamp)
                if not parsed:
                    raise CommandError(f"Invalid timestamp for entry class {subtype}: {timestamp}")
                EntryClass.objects.filter(subtype=subtype).update(timestamp=parsed)

            children_map[subtype] = children

        for subtype in update_children_for:
            entry_class = EntryClass.objects.get(subtype=subtype)
            children = children_map.get(subtype, [])
            if not children:
                entry_class.children.clear()
                continue

            child_qs = EntryClass.objects.filter(subtype__in=children)
            missing = sorted(set(children) - set(child_qs.values_list("subtype", flat=True)))
            if missing:
                self.stdout.write(
                    f"Missing child entry classes for {subtype}: {', '.join(missing)}"
                )
            entry_class.children.set(child_qs)

        self.stdout.write("EntryClass seed complete.")

    def _seed_type_mappings(self, entry_classes, populate_existing, overwrite):
        for mapping_name, model in MAPPING_MODELS.items():
            if not self._should_populate_table(model, populate_existing, overwrite):
                self.stdout.write(f"{model.__name__} table not empty; skipping.")
                continue

            mapping_fields = self._mapping_fields(model)
            unique_field = self._unique_mapping_field(model, mapping_fields)

            for entry_data in entry_classes:
                subtype = entry_data.get("subtype")
                type_mappings = entry_data.get("type_mappings", {})
                mapping_items = type_mappings.get(mapping_name)
                if not mapping_items:
                    continue
                if not isinstance(mapping_items, list):
                    raise CommandError(
                        f"{mapping_name} mappings for {subtype} must be a list."
                    )

                entry_class = EntryClass.objects.filter(subtype=subtype).first()
                if not entry_class:
                    self.stdout.write(
                        f"Skipping {mapping_name} mappings for missing entry class: {subtype}"
                    )
                    continue

                for item in mapping_items:
                    item_fields = self._normalize_mapping_item(
                        model,
                        mapping_name,
                        mapping_fields,
                        item,
                        subtype,
                    )
                    lookup = self._mapping_lookup(unique_field, mapping_fields, item_fields)
                    existing = model.objects.filter(**lookup).first()
                    if existing:
                        if overwrite:
                            for field in mapping_fields:
                                setattr(existing, field, item_fields[field])
                            existing.internal_class = entry_class
                            existing.save()
                        continue

                    model.objects.create(internal_class=entry_class, **item_fields)

            self.stdout.write(f"{model.__name__} seed complete.")

    def _mapping_fields(self, model):
        return [
            field.name
            for field in model._meta.fields
            if field.name not in {"id", "internal_class"}
        ]

    def _unique_mapping_field(self, model, mapping_fields):
        for field in model._meta.fields:
            if field.name in {"id", "internal_class"}:
                continue
            if field.unique:
                return field.name
        if len(mapping_fields) == 1:
            return mapping_fields[0]
        return None

    def _mapping_lookup(self, unique_field, mapping_fields, item_fields):
        if unique_field:
            value = item_fields.get(unique_field)
            if value is None or value == "":
                raise CommandError(f"Missing required mapping value for '{unique_field}'.")
            return {unique_field: value}
        return {field: item_fields[field] for field in mapping_fields}

    def _normalize_mapping_item(self, model, mapping_name, mapping_fields, item, subtype):
        if isinstance(item, str):
            if len(mapping_fields) != 1:
                raise CommandError(
                    f"{mapping_name} mapping for {subtype} must be an object."
                )
            item_fields = {mapping_fields[0]: item}
        elif isinstance(item, dict):
            item_fields = {field: item.get(field) for field in mapping_fields}
        else:
            raise CommandError(
                f"{mapping_name} mapping for {subtype} must be a string or object."
            )

        missing_required = []
        for field_name in mapping_fields:
            model_field = model._meta.get_field(field_name)
            value = item_fields.get(field_name)
            if (value is None or value == "") and not model_field.null and not model_field.blank:
                missing_required.append(field_name)
        if missing_required:
            missing = ", ".join(missing_required)
            raise CommandError(
                f"{mapping_name} mapping for {subtype} missing required fields: {missing}."
            )

        return item_fields
