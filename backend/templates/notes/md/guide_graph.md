# Graph Explorer

The Graph Explorer is a powerful visualization tool that helps analysts understand relationships between entries in the CRADLE system. It provides an interactive graph view where:
- Nodes represent entities and artifacts
- Edges represent relationships established through notes

![Graph Explorer]({{ static_location }}/images/notes/graph_explorer.png)

## Querying

The **Graph Explorer** allows users to search and navigate relationships between entities and artifacts in the CRADLE system using graph traversal algorithms. The interface provides multiple input options to refine searches:

1. **Search Algorithm Selection (1)**  
   Users can choose a graph traversal method to control how relationships between nodes are explored. The following search methods are supported:
   - **Breadth-First Search (BFS):** Explores all nodes up to a given depth.
   - **Pathfind:** Finds the shortest path between two nodes.

2. **Depth and Result Limits (2)**  
   The input fields allow users to specify parameters such as the minimum and maximum depth of the search, ensuring efficient querying. 

3. **Source Field (3)**  
   The **source** field is used to specify the starting entity for the search. The format follows a **category:value** structure, where:
   - `category` represents the type of entity (e.g., `id`, `email`, `username`).
   - `value` is the specific identifier within that category.

   **Example:**  
   - `source:PTI-42`
   - `ipv4:1.1.1.1`

4. **Destination Field (4) (Optional)**  
   This field specifies a target node, which helps filter the search results to paths between the source and destination. If left blank, the search returns all connected entities. 

---

## Viewing & Browsing

The right-hand side of the interface provides an interactive **graph view** for exploring query results:

- **Graph Visualization**  
  The generated graph represents **nodes** (entities and artifacts) and **edges** (relationships established through notes). Nodes are color-coded based on their category. Clicking on an edge displays the list of notes that created the relationship.

- **Graph Customization (5)**  
  Users can adjust visualization settings to enhance clarity:
  - **Search:** Clicking the **Search** button zooms into the relevant node if found in the graph.
  - **Node Size**: Modifies the appearance of individual nodes.
  - **Link Width**: Adjusts the thickness of relationship edges.
  - **Label Size**: Increases or decreases text visibility.
  - **3D View Toggle**: Enables a 3D graph rendering for improved navigation.
  - **Legend Visibility**: Toggles the display of node category explanations.

- **Legend (6)**  
  The legend explains the color coding of different entity types in the graph. By clicking on the legend, users can toggle the visibility of categories of nodes.

By interacting with the graph, users can explore relationships, expand nodes, and analyze connections dynamically.

<div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <a href="/notes/guide_notes" data-custom-href="/notes/guide_notes">← Previous</a>
    <a href="/notes/guide_fleeting" data-custom-href="/notes/guide_fleeting">Next →</a>
</div>