from typing import Iterable, List, Optional

from django.db.models.fields import json

from entries.models import Entry
from notes.models import Note
from user.models import CradleUser
from .base import BasePublishStrategy
from django.conf import settings
from ..platejs import markdown_to_pjs

DEFAULT_COVER = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAMAAAC67D+PAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAEpUExURfb3+P///+vw9enPtvSybPedQvmSK/uKHfuCDviFGezIp+v0/efr7vbo2PrHmPuNL/mHKezSvfn8//zr3vZ3G/x5HPv///hvHv7//81aJP///3w9K////11SWPr7+/v7+3tmabK4v+3u8Pz8/Pn5+aOcodfb3v///+3v8fv7/Pn6+u/w8fD09f////6NLPynW/yYQf1+EeWFQaFSHLNfJd9sGvt1FupwGvrGqXc9IxYgMzMrMnU8I8ZbHr9YH+BkG9CijS0jKxYhNX89Jt9dIZ5KJcJVIrxTI5uanyQtPSs1RkkqKM1SJpJCKIc/KK5KJ87R1DA4SB4mODhAT2szK6BBK5A8K4E6LZSZoScwQCgyQiYdKp45K4s6L7e6v2ZteExSX3pobv///7k8UpAAAAAudFJOUwAAFBFUwfLzxVsPFBd58POBElHu81y9yO3z7vDAxVfx81sEdvHyeQUEVe/vwVeiJ592AAAAAWJLR0QB/wIt3gAAAAlwSFlzAAAOwwAADsMBx2+oZAAAAAd0SU1FB+gKDxIAHC+zEOkAAAB2SURBVAjXY2BiZmFlY+fg5OJm4OHl09M3MOQXEGQQEjYyNjE1MxcRZRCzsLSytrG1sxdnkHBwdHJ2cXVzl2SQ8vD08vbx9fOXZpAJCAwKDgkNC5dlkJOPiIyKjolVUGRQUlaJi09IVFVTZ2DQ0JTR0tbRVWcEAHuCEtVq3QQlAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA5LTIwVDE0OjU3OjUyKzAwOjAwSwDbfgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNy0wOVQxMDowNDowMSswMDowMIS2gmMAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMTAtMTVUMTg6MDA6MjgrMDA6MDBYKzqDAAAAAElFTkSuQmCC"


class CatalystPublish(BasePublishStrategy):
    def __init__(self, tlp: str, category: str, subcategory: str) -> None:
        super().__init__()
        self.category = category
        self.subcategory = subcategory
        self.tlp = tlp

    def get_observable(self, catalyst_type: str, name: str) -> (str, Optional[str]):
        return ("uuid", None)

    def publish(self, title: str, notes: List[Note], user: CradleUser):
        if not user.catalyst_api_key:
            print("User does not have a Catalyst API key")
            return

        joint_md = "\n-----\n".join(map(lambda x: x.content, notes))

        entries: Iterable[Entry] = Note.objects.get_entries_from_notes(notes)
        entry_map = {}

        for i in entries:
            key = (i.entry_class.subtype, i.name)
            entry_map[key] = self.get_observable(*key)

        platejs = markdown_to_pjs(joint_md, entry_map)

        # Prepare the request body
        payload = {
            "title": title,
            "summary": "Published by cradle",
            "tlp": self.tlp,
            "category": self.category,
            "sub_category": self.subcategory,
            "cover_image": DEFAULT_COVER,
            "is_vip": False,
            "topics": [],
            "content": joint_md,
            "content_structure": platejs,
        }

        # Send the POST request
        response = json.post(
            settings.CATALYST_HOST + "/api/posts/editor-contents/",
            headers={"Authorization": user.catalyst_api_key},
            json=payload,
        )

        # Handle response
        if response.status_code == 201:  # Check for successful creation
            print("Publication created successfully:", response.json())
        else:
            print("Failed to create publication:", response.status_code, response.text)
