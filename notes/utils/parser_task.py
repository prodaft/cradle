import re
from typing import Set, Dict
from entities.models import Entity


class ParserTask:

    allowed_subtypes = {
        "entry": {
            "ip",
            "domain",
            "url",
            "username",
            "password",
            "person",
            "social-media",
            "hash",
            "tool",
            "cve",
            "ttp",
        },
        "metadata": {"crime", "industry", "country", "company"},
    }

    entity_regexes = {
        # [[actor:name|alias]]
        "actor": r"\[\[actor:((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[case:name|alias]]
        "case": r"\[\[case:((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[entry_type:name|alias]]
        "entry": r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
        # [[metadata-type:name|alias]]
        "metadata": r"\[\[([^:\|\]]+?):((?:\\[\[\]\|]|[^\[\]\|])+?)(?:\|((?:\\[\[\]\|]|[^\[\]\|])+?))?\]\]",  # noqa: E501 to avoid splitting the regex on two lines
    }

    def run(self, note_content: str) -> Dict[str, Set[Entity]]:
        """Extract the references to various entities from the content of the note.

        Args:
            note_content: The text that was written in the note.

        Returns:
            A dictionary mapping the entity types with a set of the entities
            being referenced.
        """

        referenced_entities = {}
        for entity, regex in self.entity_regexes.items():
            # references will be a list of tuples which describe matches in
            # the note content
            references = re.findall(regex, note_content)

            # for now, this applies for entities that have subtypes i.e.
            # entries & metadata
            if entity in list(self.allowed_subtypes.keys()):
                # each ref is of the form: (type, name, alias)

                # filter out references which have invalid types
                valid_references = filter(
                    lambda tup: tup[0] in self.allowed_subtypes[entity], references
                )

                # create entities that contain attributes specified in the references
                referenced_entities[entity] = set(
                    map(
                        lambda tup: Entity(name=tup[1], type=entity, subtype=tup[0]),
                        valid_references,
                    )
                )
            else:
                # each ref is of the form: (name, alias)

                # create entities that contain attributes specified in the references
                referenced_entities[entity] = set(
                    map(lambda tup: Entity(name=tup[0], type=entity), references)
                )

        return referenced_entities
