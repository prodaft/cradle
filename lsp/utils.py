from typing import Tuple, Dict, List, Any
from entries.models import Entry, EntryClass
from notes.models import Note
from user.models import CradleUser


class LspUtils:
    @staticmethod
    def get_lsp_entries(
        user: CradleUser
    ) -> List[Entry]:
        accessible_notes = Note.objects.get_accessible_notes(user, None)
        accessible_entries = Note.objects.get_entries_from_notes(
            accessible_notes
        )

        return accessible_entries

    @staticmethod
    def entries_to_lsp_pack(entries: List[Entry], entry_classes: List[EntryClass]) -> Dict[str, Dict[str, Any]]:
        pack: Dict[str, Dict[str, Any]] = {
            "classes": {},
            "instances": {}
        }

        for i in entry_classes:
            print(i.subtype)
            if i.subtype not in pack["classes"]:
                if i.regex:
                    pack["classes"][i.subtype] = {"regex": i.regex}
                elif i.options:
                    pack["classes"][i.subtype] = {"enum": i.options.split("\n")}


        for i in entries:
            if i.entry_class.subtype not in pack["instances"]:
                pack["instances"][i.entry_class.subtype] = []

            pack["instances"][i.entry_class.subtype].append(i.name)

        return pack
