+++
date = '2025-03-05T12:55:52+01:00'
draft = false
linkTitle = 'Note Taking'
title = 'Note Taking'
weight = 1
+++

CRADLE allows users to create and manage notes associated with specific entities and artifacts.

When a note is created, the system automatically links the entities, actors, and artifacts mentioned within it. These connections are displayed in the entry dashboards and graph visualization features of the application.

Notes are composed using a specialized markdown syntax. The application offers a markdown editor with syntax highlighting and live preview, making the process of writing notes more efficient.

## Note Syntax

CRADLE employs an extended markdown syntax that builds upon the standard specification while incorporating features for linking and referencing entities and artifacts. The syntax highlighting and live preview support users in writing and formatting their notes effectively.

### Basic Markdown Support
- **Headers:** (`#`, `##`, `###`)
- **Lists:** Both bulleted and numbered
- **Text Formatting:** Bold, italic, and strikethrough
- **Code:** Inline code and code blocks
- **Links and Images**
- **Tables**
- **Blockquotes**

### Entity and Artifact Linking
CRADLE extends markdown with a special syntax to link to entities and artifacts using double square brackets:

- `[[entry:entry_name|alias]]` – Links to an entity.

The alias portion is optional and can be used to display a more user-friendly name. When adding links in tables, be sure to escape the alias separator to avoid conflicts, for example: `[[entry:entry_name\|alias]]`.

### Best Practices

- Utilize the alias to improve readability.
- Keep notes concise—CRADLE automatically links and aggregates them under relevant entities.
- Save work-in-progress notes as fleeting notes until they are ready for publication.

## Adding and Referencing Files in Notes

CRADLE supports adding multiple files to notes without any limitations on number or size—the only restriction is your bucket size in Minio storage. If you encounter issues, contact your administrator to increase your bucket size.

Files can be uploaded either by using the file selection button at the top of the markdown editor or by pasting files from the clipboard. Once uploaded, files appear in a table below the editor, where you can insert references, copy file references, or delete files as needed.

If the file is an image, it will render in the note when you prepend its reference with a `!`, for example: `![image][image.png]`.

![Upload File View](/images/userguide/notes_files.png)


## Role of Notes in Linking Entries

In CRADLE, finalizing a note triggers an automatic detection of references—marked by double brackets—to create bi-directional links between the referenced entities and artifacts. These links are visible only to users with appropriate access. If a note is deleted, its links are removed unless supported by other notes.
For best results, use clear, consistent naming for references, organize notes with meaningful headers, and verify links before finalizing, as they become permanent.

### Navigation

{{< cards columns="2">}}
  {{< card link="/docs/userguide/" title="User Guide" icon="arrow-left" >}}
  {{< card link="/docs/userguide/graph/" title="Next" icon="arrow-right" >}}
{{< /cards >}}
