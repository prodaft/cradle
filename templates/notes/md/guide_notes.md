# Note Taking

CRADLE allows users to create and manage notes related to specific entities and
artifacts.

When a note is created, the system automatically links the entities, actors, and
artifacts mentioned in the note.  These connections are displayed in the entry
dashboards and graph visualization features of the application.

Notes are created using a specific markdown syntax.  The application provides a
markdown editor with syntax highlighting and live preview to help users write
notes more efficiently.

## Note Syntax

CRADLE uses an extended markdown syntax that builds upon the standard markdown
specification while adding special features for linking and referencing entities
and artifacts. The syntax highlighting and live preview help users write and
format their notes efficiently.

### Basic Markdown Support
- All standard markdown features are supported including:
  - Headers (# ## ###)
  - Lists (bulleted and numbered)
  - Text formatting (bold, italic, strikethrough)
  - Code blocks and inline code
  - Links and images
  - Tables
  - Blockquotes

### Entity and Artifact Linking
CRADLE extends markdown with a special syntax for linking to entities and
artifacts using double square brackets:

- `[[entry:entry_name|alias]]` - Link to an entity

The alias portion is optional and can be used to display a more readable name in
the text. When adding links in tables, one must be careful to escape the alias
portion to avoid conflicts with the table syntax. Eg. `[[entry:entry_name\|alias]]`.

### Best Practices

- Use the alias portion to make the note more readable.
- It is not necessary to create big notes. CRADLE takes care of linking notes and aggregating them under entities.
- If a note is not ready to be published, it is better to save it as a fleeting note.


## Adding and Referencing Files to Notes

Cradle supports adding files to notes. There is no limit to the number of files
and the size of the file that can be added to a note.  The only limit to the
size of the file is the bucket size of the user in the Minio storage. If
necessary, you should contact the administrator to increase your bucket size.

Uploading files to a note can be done by either using the choose files button
(1) on top of the markdown editor or pasting files from the clipboard. Once the
file is uploaded, it will show up in the uploaded files table below the editor.
Using this table, insert a reference to the file in the text (2), copy a
reference to the file (2), and delete the file (4).

If the file is an image, it can be rendered as one by prepending a `!` to the reference. Eg. `![image][image.png]`.

![screenshot]({{ static_location }}/images/notes/notes_files.png)

## Role of Notes in Linking Entries

In CRADLE, notes automatically link referenced entities and artifacts to build a
comprehensive knowledge graph of your information. When a note is finalized,
CRADLE detects references—denoted by double brackets—and creates bi-directional
links between the referenced items. These links are established only upon
finalization and are visible only to users with the proper access. If a note is
deleted, its links are also removed unless they are supported by other notes.
It is best to use clear, consistent naming for references, organize notes with
meaningful headers, and double-check references before finalizing, as the links
become permanent.


<div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <a href="/notes/guide" data-custom-href="/notes/guide">← Previous</a>
    <a href="/notes/guide_graph" data-custom-href="/notes/guide_graph">Next →</a>
</div>