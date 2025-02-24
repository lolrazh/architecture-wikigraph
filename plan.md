# **Project Upgrade Implementation Plan**

The goal is to upgrade the existing static graph application by:

1. **Migrating Data from JSON to a Local SQLite Database**  
2. **Refactoring the API Layer to Use SQLite**  
3. **Implementing Global State Management in the Front End**  
4. **Enhancing UI Interactions (Shift‑Click to Expand, Control‑Click to Highlight)**  
5. **Offloading Heavy Computations with Web Workers**  
6. **Deploying Incremental Changes Without Breaking the App**

Each section below explains what to do, how to do it, and provides code examples and analogies for clarity.

---

## **Step 1: Migrate Data to SQLite**

### **Objective:**
Replace the static JSON file with a lightweight, file‑based SQLite database that runs locally and works offline.

### **Actions:**

1. **Design the Database Schema:**
   - **Nodes Table:**  
     - **Columns:**  
       - `id` (TEXT, Primary Key)  
       - `depth` (INTEGER)  
       - `category` (TEXT, e.g., 'root' or 'architecture')  
       - Additional fields (e.g., `label`, `description` if needed)
   - **Links Table:**  
     - **Columns:**  
       - `id` (INTEGER, Primary Key, auto‑increment)  
       - `source` (TEXT, Foreign Key referencing nodes.id)  
       - `target` (TEXT, Foreign Key referencing nodes.id)  
       - `depth` (INTEGER, optional)

2. **Create the SQLite Database:**
   - Use a tool like the command‑line SQLite client or a GUI tool (e.g., DB Browser for SQLite) to create the database file (e.g., `graph.db`).

3. **Write a Migration Script:**
   - Develop a script (in Node.js, Python, etc.) that reads the existing JSON file and populates the database.
   - **Key Considerations:**  
     - Ensure that nodes are deduplicated.  
     - Insert links only after nodes have been inserted.
   - **Analogy:**  
     Think of this as converting a printed phone book into a digital, searchable directory.

4. **Verify the Data:**
   - Use a SQLite browser to confirm that the tables contain the expected data without duplicates.

### **Deliverables:**
- `graph.db` file with correct schema and data.
- Migration script with clear instructions for future runs if needed.

---

## **Step 2: Update API Endpoints to Use SQLite**

### **Objective:**
Refactor the Next.js API routes to query the SQLite database instead of reading from a JSON file.

### **Actions:**

1. **Set Up SQLite Access in the API:**
   - Use a Node.js library like `sqlite3` or an ORM like Prisma (configured for SQLite).
   - Create a helper function (e.g., `getDb()`) that opens the database connection.

2. **Implement API Endpoints:**
   - **Endpoint for Root Node ("Architecture"):**
     - Query all nodes and links.
   - **Endpoint for Any Other Node:**
     - Query the links where the given node appears as either `source` or `target`.
     - Derive the connected node IDs (using SQL `DISTINCT` or filtering in code) to avoid duplication.
     - Query the nodes table for these IDs.
   
3. **Example Code Snippet:**

   ```js
   // File: src/app/api/node-connections/route.ts
   import sqlite3 from 'sqlite3';
   import { open } from 'sqlite';
   import { NextResponse } from 'next/server';

   async function getDb() {
     return open({
       filename: './graph.db',
       driver: sqlite3.Database
     });
   }

   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const nodeId = searchParams.get('id');
     if (!nodeId) {
       return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
     }
     try {
       const db = await getDb();
       if (nodeId === 'Architecture') {
         const nodes = await db.all('SELECT * FROM nodes');
         const links = await db.all('SELECT * FROM links');
         return NextResponse.json({ nodes, links });
       } else {
         const links = await db.all(
           'SELECT * FROM links WHERE source = ? OR target = ?',
           [nodeId, nodeId]
         );
         const connectedIds = new Set([nodeId]);
         links.forEach(link => {
           connectedIds.add(link.source === nodeId ? link.target : link.source);
         });
         const placeholders = [...connectedIds].map(() => '?').join(',');
         const nodes = await db.all(
           `SELECT * FROM nodes WHERE id IN (${placeholders})`,
           [...connectedIds]
         );
         return NextResponse.json({ nodes, links });
       }
     } catch (error) {
       console.error('Database query error:', error);
       return NextResponse.json({ error: 'Failed to fetch node connections' }, { status: 500 });
     }
   }
   ```

4. **Test the API:**
   - Use Postman or your browser to send requests.
   - Verify that the correct data is returned and deduplication works as intended.

### **Deliverables:**
- Updated API endpoints that use SQLite.
- Documentation on how to run and test these endpoints.

---

## **Step 3: Implement Global State Management in the Front End**

### **Objective:**
Centralize the app’s state so that UI interactions (selecting nodes, expanding nodes, highlighting connections) are managed in one place.

### **Actions:**

1. **Choose a Global State Library:**
   - Use **Zustand** for simplicity and performance.
   
2. **Define the Global State Structure:**
   - **State Variables:**
     - `nodesData`: Array of node objects.
     - `linksData`: Array of link objects.
     - `selectedNode`: Currently selected node for detailed view.
     - `expandedNodes`: Set of nodes that have been expanded (via shift‑click).
     - `highlightedConnections`: List or set of node IDs that are highlighted (via control‑click).
     - UI flags (e.g., loading, error states).

3. **Example Store Setup (using Zustand):**

   ```js
   // File: src/store/useGraphStore.ts
   import create from 'zustand';

   export const useGraphStore = create((set) => ({
     nodesData: [],
     linksData: [],
     selectedNode: null,
     expandedNodes: new Set(),
     highlightedConnections: new Set(),
     setNodesData: (nodes) => set({ nodesData: nodes }),
     setLinksData: (links) => set({ linksData: links }),
     setSelectedNode: (node) => set({ selectedNode: node }),
     addExpandedNode: (nodeId) =>
       set((state) => {
         const newSet = new Set(state.expandedNodes);
         newSet.add(nodeId);
         return { expandedNodes: newSet };
       }),
     addHighlightedConnection: (nodeId) =>
       set((state) => {
         const newSet = new Set(state.highlightedConnections);
         newSet.add(nodeId);
         return { highlightedConnections: newSet };
       }),
     clearHighlights: () => set({ highlightedConnections: new Set() }),
   }));
   ```

4. **Integrate Global State in UI Components:**
   - Update your `Graph.tsx` component to read data and dispatch actions from/to the global store.
   - Replace local state for node selections, expansions, and highlights with calls to `useGraphStore`.

5. **Test the State Management:**
   - Confirm that selecting a node updates the global state.
   - Ensure that shift‑click and control‑click actions modify the state as expected.

### **Deliverables:**
- A working global state store.
- Updated UI components that use this store for all interactions.

---

## **Step 4: Enhance UI Interactions (Shift‑Click and Control‑Click)**

### **Objective:**
Improve node interactivity by adding two new features:
- **Shift‑Click:** Expand a depth‑1 node to reveal connected depth‑2 nodes.
- **Control‑Click:** Highlight all connections of the clicked node.

### **Actions:**

1. **Implement Shift‑Click:**
   - In your node click handler (inside `Graph.tsx`), detect if the Shift key is pressed.
   - On shift‑click:
     - Fetch the depth‑2 nodes from the API if not already in state.
     - Update the global state to add these nodes to `expandedNodes`.
     - Merge the new nodes with the existing ones while ensuring no duplicates.
   - **Analogy:**  
     Think of shift‑clicking as “opening a folder” on your desktop to reveal additional files without cluttering your view with duplicates.

2. **Implement Control‑Click:**
   - Similarly, detect if the Control (or Cmd) key is pressed during the click event.
   - On control‑click:
     - Identify all nodes connected to the clicked node.
     - Update the `highlightedConnections` state to include these node IDs.
     - The UI should then visually differentiate these nodes (e.g., by changing color or border).
   - **Analogy:**  
     Control‑click is like highlighting related items in a list so you can see all their relationships at once.

3. **Update UI Components:**
   - In your graph visualization component, adjust node rendering to check the global state and apply highlighting styles if the node is in the `highlightedConnections` set.
   - Similarly, check for nodes in the `expandedNodes` state and ensure they’re rendered only once.

4. **Testing:**
   - Manually test shift‑click and control‑click interactions.
   - Use console logs or state debugging tools to confirm that the global state is updated correctly.

### **Deliverables:**
- Shift‑click and control‑click behaviors fully implemented.
- Visual changes in the graph reflecting the new interactions.
- Documentation on how these interactions work for future reference.

---

## **Step 5: Offload Heavy Computation with Web Workers**

### **Objective:**
Ensure that heavy physics (force calculations) do not block the UI by moving them into a separate thread using Web Workers.

### **Actions:**

1. **Extract Force Calculation Logic:**
   - Identify the parts of your force calculation code (e.g., Barnes‑Hut algorithm in `force.calculator.ts`) that can run independently.
   - Refactor this code into a module that can be imported by a Web Worker.

2. **Create a Web Worker Script:**
   - Create a new file (e.g., `forceWorker.js` or `forceWorker.ts`).
   - In the worker, import your force calculation module.
   - The worker should listen for messages (e.g., updated node positions on drag‑end) and compute new positions.
   - Once done, post the computed results back to the main thread.

3. **Integrate the Worker with the Main Thread:**
   - In your `Graph.tsx`, create a new Web Worker instance.
   - Instead of performing calculations on the main thread during drag events, send the node data to the worker.
   - Listen for messages from the worker and update the global state with the new node positions.
   - **Optional:** Use [Comlink](https://github.com/GoogleChromeLabs/comlink) to simplify the message‑passing interface if needed.

4. **Testing:**
   - Ensure that drag events remain smooth and responsive.
   - Validate that the worker returns correct results and that the UI updates accordingly.

### **Deliverables:**
- A working Web Worker for force calculations.
- Updated drag event handlers that communicate with the worker.
- Documentation on the worker’s API and integration points.

---

## **Step 6: Incremental Deployment & Testing Strategy**

### **Objective:**
Deploy changes in small, manageable chunks so that the existing functionality remains stable and you can quickly roll back if needed.

### **Actions:**

1. **Phase 1: Database & API Upgrade**
   - Deploy the migration script and updated API endpoints using SQLite.
   - Test thoroughly using Postman or similar tools.
   - Ensure that the UI can still fetch data (e.g., for the “Architecture” node) without error.

2. **Phase 2: Global State Management**
   - Introduce the global state store and update a few components.
   - Deploy the changes and test that state updates work (e.g., node selections).
   - Maintain a fallback to local state if necessary until the global store is proven stable.

3. **Phase 3: UI Interactions**
   - Implement and deploy the shift‑click and control‑click features.
   - Test these interactions in isolation as well as in combination with the new state management.

4. **Phase 4: Web Worker Integration**
   - Deploy the Web Worker for force calculations.
   - Run performance tests to confirm that UI responsiveness has improved.
   - Monitor for any edge cases or errors in worker communication.

5. **Documentation & Rollback Plan:**
   - Document each phase’s changes and ensure tests (unit, integration, and manual) cover new features.
   - Maintain version control branches so that you can quickly revert to a previous stable state if issues arise.

### **Deliverables:**
- A deployment checklist for each phase.
- Comprehensive tests and documentation.
- A rollback plan for emergencies.