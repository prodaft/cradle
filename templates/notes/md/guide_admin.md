# Administration
CRADLE provides administrators with powerful tools to manage users, entities, and system-wide settings. This guide explains the key administrative functions and how to use them effectively.

## Management Panel

The management panel is the central hub for all management functions, accessible through the 'Management' link in the sidebar. It consists of three main sections:

1. **Entities Management** (Accessible to both admins and entry managers)
   - Create new entities
   - Edit existing entities
   - Delete entities
   - View entity activity logs (Only accessible to admins)
   - Manage entity metadata and descriptions

2. **Entry Types Management** (Accessible to both admins and entry managers)
   - Create new entry classes
   - Edit existing entry classes
   - Define validation rules for artifacts
   - Manage entry type hierarchies

3. **User Management** (Only accessible to admins)
   - View all system users
   - Manage user permissions
   - View user activity logs
   - Delete user accounts
   - User details can be edited by using the pencil icon next
   - User permissions can be managed by clicking on the user

## Details on Entry Classes

Entry classes are the core of how CRADLE organizes data. They are used to classify pieces of evidence into correct types. Entry classes
have the following fields:
- **Type:** This can be either `entity` or `artifact`.
    - **Entity:** An entity is a high-level object of investigation. It defines the access level of the notes referencing it.
    - **Artifact:** These are pieces of evidence that are open to all users. Anyone can link to any artifact type.
- **Subtype(Name):** This defines a unique category for the entry. It can be anything, for example `email`, `username`, `ip`, `domain`, `source` etc.
- **Format:** This defines what kind of values are valid for the entry. It can be a simple regex(**Regex**), or a list of values(**Enumerator**)
    - **Regex:** A regular expression that is used to validate the artifact. It is used to ensure that the artifact is a valid piece of evidence.
    - **Enumerator:** A list of values that are valid for the entry. In the admin panel, you set a list of values sepearted by newlines.
- **Color:** This defines the color of the entry in the knowledge graph.
- **CaRalyst Type:** This is used to associate the entry with a value in the Catalyst/Blindspot project.It is of the format `type/subtype|model_class|level`.
    - `type/subtype`: The type of threat intelligence object and its [type](https://prod.blindspot.prodaft.com/api/docs/swagger/#/Threat%20Intelligence/observables_list). For instance `observables/IP_ADDRESS` sends a request to `/api/observables` with `type=IP_ADDRESS`
    - `model_class`: The model class of the entry used to link in posts in Catalyst. This is often the singular form of type.
    - `level`: The level the entry will be linked to in Catalyst posts, e.g. `OPERATIONAL`

## Details on Logs

CRADLE keeps extensive logs of all system activity. Logs have three parts:
- **User:** The user that performed the action.
- **Object:** The object that was affected by the action.
- **Action:** The action that was performed.
    - **Create:** A user has edited this related object.
    - **Edit:** A user has edited this related object.
    - **Delete:** A user has deleted this related object

### Log Propagation

A log is propagated across to all entities that were affected by that initial log. For instance, the creation a note referencing an entity will propagate into an edit log on the entity.
The example belows shows an example of such a log, where the user admin has created an edit event by creating a note referencing entity `PTI-...`.

![log_propagation]({{ static_location }}/images/notes/log_propagation.png)