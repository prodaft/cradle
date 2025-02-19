# User Guide for CRADLE

## Table of Contents

1. [Introduction](#introduction)
2. [Rules and Guidelines](#rules-and-guidelines)
2. [Getting Started](#getting-started)
3. [Features and Functionality](#features-and-functionality)
4. [Troubleshooting](#troubleshooting)
5. [FAQ](#faq)
6. [Contact Information](#contact-information)

## Introduction

CRADLE is a collaborative note-taking tool tailored to support and
streamline the workflow of cyber threat analysts.

CRADLE is designed to help analysts manage and organize their notes, as well as
facilitate collaboration with other analysts.

The application is meant to be used by
threat analysts working on the same entities to centralize and share information. This is
done by allowing analysts to create and share notes referencing specific entities and artifacts
of interest.

The application automatically links the artifacts and entities mentioned in the
notes, making it easier to navigate and understand the context of the information.

CRADLE allows visualizing the relationships between entities and artifacts through informative
dashboards and graphs.

The application also provides features for generating and exporting reports
based on the information stored in the system.

Security and confidentiality are ensured by
providing a strong access control system that allows administrators and trusted users to
manage permissions and access levels on an entity-by-entity basis.

## Getting Started

### Installation

CRADLE can be used either as a web application or as a desktop application.
The web application can be accessed through a web browser,
while the desktop application can be installed on your local machine.

To access the web application version of CRADLE,
follow the link provided by your system administrator or visit the CRADLE website.

To install the desktop application version of CRADLE,
follow the steps below:

-   TBA

### Account Creation/Registration

When you first access CRADLE, you will need to create an account to start using the application.
To create an account, follow these steps:

1. Click on the `Register` button on the login page.
2. Fill in the required information, such as your username, email address, and password. The password you use must contain at least 12 characters, including at least one upperentity letter, one lowerentity letter, one number, and one special character. In entity the password does not meet the requirements or the username is already in use, an error message will be displayed.
3. Click on the `Register` button to create your account. This will redirect you to the login page.

To create an administrator account there are 2 possible ways:

1. Set up the corresponding environment variables for admin creation before booting up the server for the first time.
   An administrator account is created by default using the provided settings.
2. Run the command: `python manage.py createsuperuser` from the terminal of the server.
   Complete the credentials as requested in the command line interface.

To log in to CRADLE, follow these steps:

1. Enter your username and password in the login page.
2. Click on the `Login` button or press enter to access your account. You will be redirected to the welcome page of the application or the last page you visited.

## Features and Functionality

This section should provide an overview of the main features of your application and how to use them.

### Navigation

CRADLE provides a user-friendly interface that allows users to navigate through the application easily. The main navigation elements include:

#### Sidebar

A sidebar menu with links to different sections of the application. The sidebar provides quick access to the
[welcome page](#welcome-page), [note creation page](#creating-a-note), [graph visualization page](#graph-visualization)
[notifications panel](#notifications) and logout controls. In entity the user is an administrator,
the sidebar will also include access to the [admin page](#admin-controls). The sidebar shows icons
and for each section, additionally expanding the sidebar to display the section name when hovered.

#### Top Bar

A top bar with quick access to navigation controls for going back and forward through the page history, a [fleeting notes](#fleeting-notes) button
that toggles the display of the fleeting notes panel, and a [search bar](#search) that allows users to search for specific entities, artifacts, or notes.

The top bar displays additional controls dynamically based on the page currently displayed.

#### Main Content Area

A main content area where the main pages are displayed.

### Welcome Page

The welcome page is the first page users see when they log in to CRADLE.
It provides an overview of the recent activity in the system, including new notes, and recently mentioned entities and actors.

This page can be quickly accessed by clicking on the Home icon in the sidebar.

### Note Taking

CRADLE allows users to create and manage notes related to specific entities and artifacts.

When a note is created, the system automatically links the entities, actors, and artifacts mentioned in the note.
These connections are displayed in the [entry dashboards](#dashboards) and [graph visualization](#graph-visualization) features of the application.

Notes are created using a specific markdown syntax.
The application provides a markdown editor with syntax highlighting and live preview to help users write notes more efficiently.

#### Note Syntax

The note syntax is based on the [original markdown specification](https://daringfireball.net/projects/markdown/syntax) with some additional features to support linking to entities, actors and artifacts.
The syntax for linking to entities, actors and artifacts is as follows:

-   `[[entity:entity_name|alias]]` - Link to an entity with the specified name and optional alias.
-   `[[actor:actor_name|alias]]` - Link to an actor with the specified name and optional alias.
-   `[[artifact_type:artifact_name|alias]]` - Link to an artifact with the specified name and optional alias.
-   `[[metadata_type:metadata_name|alias]]` - Link to a metadata with the specified name and optional alias.
-   The alias is optional and can be used to provide a more descriptive name for the link.
-   The supported artifact types are:
    `'ip',
'domain',
'url',
'username',
'password',
'social',
'hash',
'tool',
'cve',
'ttp',
'malware',
'campaign',
'family'`. - If the artifact type is not recognized, the link will be displayed as plain text.
    If you believe this list should be updated, please contact the system administrator.
-   The supported metadata types are:
    `'crime', 'industry', 'country', 'company'`.
    -   If the metadata type is not recognized, the link will be displayed as plain text.
        If you believe this list should be updated, please contact the system administrator.

#### Adding and Referencing Files to Notes

Users can also attach files to notes by using the file upload button.
The files will be stored securely and can be downloaded by users with access to the note referencing them.

The user has access to a panel that displays the files attached to the note, right below the editor.
Files uploaded to notes are not linked to entities, actors or artifacts, but can be referenced in the note text.

To reference a file in the note text, simply press the `Copy to Clipboard` button next to the file name in the attachments panel and paste the link in the note text.
To remove a file from the note, click on the `Remove` button next to the file name in the attachments panel.
The files will be removed from the note, but will still be uploaded to the system. The unreferenced uploaded files should be removed from the system by the system administrator.

#### Fleeting Notes

Fleeting notes are a feature that allows users to create draft notes.
These notes are fundamental to the workflow of the application, as they are automatically created and saved as the user types.
All notes are saved as fleeting notes by default, and can be edited and saved as final notes at any time.
**Only fleeting notes can be edited. When a note is marked as final it becomes immutable.**

-   Fleeting notes are draft notes that are automatically created saved as the user types.
-   These notes are displayed in the fleeting notes panel, which can be toggled by clicking on the fleeting notes button in the top bar.
-   Clicking on a fleeting note in the panel will open the note in the editor for further editing.
-   The fleeting notes can be edited and saved as final notes at any time.
-   Fleeting notes are autosaved when the user stops typing for 1 second.
-   The fleeting notes can be deleted by the user at any time.
-   The fleeting notes are saved on the server and can be accessed from any device.
-   The fleeting notes are not linked to entities, actors or artifacts and are not visible to other users.

#### Creating a Note

Note creation and editing is done through the note editor, which provides syntax highlighting and live preview.
The editing is done in a code editor like interface, with the live preview displayed on the right side of the editor.
Additional controls for saving, marking as final and deleting the note are displayed in the top bar.
Controls for attaching files to the note are displayed above the editor.

To create a note, follow these steps:

-   Click on the `New Note` button in the sidebar.
-   Fill in the note content using the markdown editor.
-   The note will be automatically saved as a fleeting note immediately after the user stops typing (1 second delay).
-   Continue editing the draft note until you are ready to mark it as a final note.
    This can be done by clicking on the `Save As Final` button in the editor.
    This actions will also give extra options for choosing the "[publishable](#publishable-and-non-publishable-notes)" status of the note before finalizing.
    When a note is marked as final it becomes immutable, links between entries are created and the note becomes visible to other users.

### Dashboards

Dashboards are pages that provide all the aggregated data related to a specific entry, such as an entity, actor, or artifact.
The dashboards display information about the entry, including notes, and relationships with other entries.

Dashboards can be accessed using the [search](#search) feature, by clicking on a link in a [note](#note-taking), or by clicking on a node in the [graph visualization](#graph-visualization) feature.

The fields of the dashboard are dynamically generated based on the entry type, and can include:

-   General information about the entry, such as name, description, and type.
-   A list of entities directly linked to the entry.
-   A list of actors directly linked to the entry.
-   A list of artifacts directly linked to the entry.
-   A list of notes that mention the entry.

If there are entities related to the entry to which the user does not have [access](#access-control), a text giving options to request access appears.

The dashboards also provide a button for [publishing](#publishing-reports) reports based on the information displayed on the dashboard.
The button is displayed on the top bar.

Admins additionally have access to a button for deleting the entry on entity and actor dashboards.

Clicking on an entity, actor, or artifact in the dashboard will redirect the user to the respective dashboard of the selected entry.
Clicking on a note in the dashboard will open the note in the preview mode, allowing the user to read the note content.

### Graph Visualization

The graph visualization feature allows users to visualize the relationships between entities, actors, and artifacts in the system.
The graph is interactive and allows users to explore the connections between entries.
The graph can be zoomed in and out, and panned to explore the connections between entries.

Clicking on a node in the graph will display a card (on the top left of the screen) with information about the entry, and a link to the [entry dashboard](#dashboards).

#### Graph Controls

By clicking on the menu icon on the top right corner of the graph, users can access additional controls.
Some of the controls allow users to:

-   Filter the graph by entry by label.
-   Reset the graph by clicking on the reset button.
-   Change properties of the physics simulation of the graph:
    -   The strength of the repulsion between nodes (node spacing). This is relative to the number of nodes.
    -   The sizing of the nodes. This is also relative to the degree of the nodes.
    -   The spacing between disjoint components of the graph. This is also relative to the number of nodes.
    -   The strength of the gravitational pull on the nodes (towards the center of the graph).

### Search

The search feature allows users to search for specific entities, actors, artifacts in the system.

To search for an entry, follow these steps:

-   Click on the search bar in the top bar. This will open a dialog box with search options.
-   Type the name of the entry you want to search for in the search bar in the dialog.
-   Optionally, you can filter the search results by entry type (entity, actor, artifact) and artifact type. To do this click on the filters button in the search dialog to expand the filter section.
-   Click on the `Search` icon in the dialog or press `enter` to perform the search.
-   Click on a search result to redirect to the respective dashboard of the selected entry.

The search results are displayed in a list format, with the name of the entry and the type of entry.
Clicking on a search result will redirect the user to the respective [dashboard](#dashboards) of the selected entry.

### Notifications

Notifications are messages that inform users about important events in the system, such as [requests for access, and access level updates](#access-control).
Notifications are displayed in a panel that can be toggled by clicking on the `Bell` icon in the sidebar.
When unread notifications are present, the label of the icon will display the number of unread notifications.

The notifications panel displays the notifications in a list format, with the most recent notifications at the top.
Notifications can be marked as unread or read by clicking on the `Mark Read` / `Mark Unread` button on the notification.
Unread notifications are counted in the label of the `Bell` icon in the sidebar.

There are notifications for when certain users request access to entities. All users wit `Read-Write` access on those entities receive these notifications.
Users with `Read-Write` access to an entity can allow access to entities from notifications by clicking on one of the `Read` or `Read-Write` buttons in the notification.

### Publishing Reports

CRADLE provides a feature for generating and exporting reports based on the information stored in the system.
Reports can be generated for entities, actors, and artifacts, and include information such as notes, relationships, and attachments.
Reports can be generated only using the contents of [publishable notes](#publishable-and-non-publishable-notes).

To create a report, follow these steps:

-   Click on the `Enter Publish Mode` button on the [dashboard](#dashboards) of the entry you want to base the report on
-   Select which of the publishable notes you want to include in the report then click the `Publish` button.
-   From the report preview page click the `Download Report As...` button and then select the export format from the dropdown to download the report in the desired format. On this page you can also press the `Show JSON` / `Show HTML` button to switch between preview modes.

#### Publishable and Non-Publishable Notes

Each note in the system can be either marked as publishable or non-publishable.
Publishable notes are notes that contain information that can be shared in reports.
Non-publishable notes are notes that contain sensitive information that should not be shared in reports.

When a marking a [fleeting note](#fleeting-notes) as final, the user can choose whether the note is publishable or non-publishable.

The users can also change the publishable status of a note at any time by clicking on the `Publishable` switch in the note preview.

The users can also change the publishable status of a note at any time by clicking on the `Publishable` switch in the note card in an entry dashboard.

Only publishable notes can be included in the reports generated by the system.

### Access Control

The system provides a strong access control system that allows administrators and trusted users to manage permissions and access levels on an entity-by-entity basis.

**Users can only see notes related to entities they have access to. If a note mentions an entity the user does not have access to, the note will be hidden from the user.**

The access control system includes the following access levels:

-   `None` - Users with no access to the entity. They cannot view or interact with the entity in any way. They can only request access to the entity if informed of its existence.
-   `Read`: Users with read access can view the entity, actors, and artifacts linked to the entity, as well as the notes that mention the entity.
-   `Read-Write`: Users with read-write access have the same permissions as users with read access, but can also create and edit notes related to the entity.
-   `Admin`: Users with admin access have full control over the entity, including the ability to manage access levels, delete the entity, and manage notes.

The access control system is managed by the system administrator, who can assign access levels to users on an entity-by-entity basis.
Users can request access to entities they do not have access to by clicking on the `Request Access` button on the entity [dashboard](#dashboards).
The request will be sent as a [notification](#notifications) to the users with `Read-Write` or `Admin` access to the entity, who can approve or deny the request.

### Admin Controls

Users with admin access have access to additional controls in the application, including:

-   The ability to create new entities and actors.
-   The ability to delete entities and actors.
-   The ability to manage [access levels](#access-control) for entities.
-   The ability to delete users from the system.

These controls are accessible through the admin page, which can be accessed by clicking on the `Admin` link in the sidebar.

The admin page provides a list of entities, actors, and users in the system, as well as controls for creating new entities and actors, and managing access levels and user permissions.
Searching for a specific entity, actor, or user can be done by using the search bar in the respective column of the admin page.
Deleting an entity, actor, or user can be done by clicking on the `Delete` button next to the entry in their list.
Managing access level for an entity can be done on a per-user basis by clicking on the user's card and then selecting the desired access level for the entity in the list of entities.

## Troubleshooting

TBA

## FAQ

TBA

## Contact Information

TBA
