/**
 * forest.js
 *
 * Responsibility: take the array of accepted valid edges and produce the
 * complete hierarchy response payload.
 *
 * Pipeline inside this file:
 *   1. buildAdjacency   – directed adjacency list + set of all child nodes
 *   2. findComponents   – Union-Find to group nodes into connected components
 *   3. pickRoot         – for each component, choose the natural root or fallback
 *   4. detectCycle      – iterative DFS (grey/black colouring) on directed graph
 *   5. serialiseTree    – iterative post-order traversal → nested object + depth
 *   6. buildForest      – orchestrates 1-5, computes summary, sorts output
 *
 * Nothing in this file knows about the HTTP layer or validation rules.
 */

// ─── Step 1: Adjacency & child-node tracking ──────────────────────────────────

/**
 * Builds a directed adjacency list and records every node that appears
 * as the destination of an accepted edge.
 *
 * @param {Array<{ from: string, to: string }>} edges
 * @returns {{
 *   adjacency: Map<string, string[]>,   // node -> list of direct children
 *   childNodes: Set<string>,            // every node that has a parent
 *   allNodes:   string[]                // sorted list of every unique node
 * }}
 */
function buildAdjacency(edges) {
  const childNodes = new Set();
  const nodeSet    = new Set();
  const adjacency  = new Map();

  for (const { from, to } of edges) {
    nodeSet.add(from);
    nodeSet.add(to);
    childNodes.add(to);

    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  }

  // Ensure every node has an entry, even if it has no children (leaf node)
  for (const n of nodeSet) {
    if (!adjacency.has(n)) adjacency.set(n, []);
  }

  const allNodes = [...nodeSet].sort();
  return { adjacency, childNodes, allNodes };
}

// ─── Step 2: Union-Find → connected components ────────────────────────────────

/**
 * Classic Union-Find with path compression.
 * Operates on the UNDIRECTED view of the edges so that nodes connected
 * by any edge (in either direction) end up in the same component.
 *
 * @param {string[]} allNodes
 * @param {Array<{ from: string, to: string }>} edges
 * @returns {Map<string, string[]>}  component-representative -> member nodes
 */
function findComponents(allNodes, edges) {
  // Each node starts as its own representative
  const rep = new Map(allNodes.map((n) => [n, n]));

  function find(x) {
    // Path compression: make every ancestor point directly to the root
    if (rep.get(x) !== x) rep.set(x, find(rep.get(x)));
    return rep.get(x);
  }

  function unite(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) rep.set(ra, rb); // merge smaller into larger (simplified)
  }

  for (const { from, to } of edges) {
    unite(from, to);
  }

  // Group members by their final representative
  const components = new Map();
  for (const n of allNodes) {
    const root = find(n); // call find() again to get the fully-compressed rep
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(n);
  }

  return components;
}

// ─── Step 3: Root selection ───────────────────────────────────────────────────

/**
 * Picks the root for one connected component.
 *
 * A natural root is a node that never appears as a child in ANY accepted edge.
 * Because we enforced single-parent, each well-formed tree has exactly one.
 *
 * If the component has no natural root (pure cycle — every node has a parent),
 * we fall back to the lexicographically smallest node in the component.
 *
 * @param {string[]} members   - all nodes in this component
 * @param {Set<string>} childNodes - global set of all nodes that have a parent
 * @returns {string}
 */
function pickRoot(members, childNodes) {
  const naturalRoots = members
    .filter((n) => !childNodes.has(n))
    .sort(); // lex order, so [0] is lex-smallest

  if (naturalRoots.length > 0) {
    return naturalRoots[0];
  }

  // Pure-cycle fallback: lex-smallest member
  return [...members].sort()[0];
}

// ─── Step 4: Cycle detection ──────────────────────────────────────────────────

/**
 * Iterative DFS with three-colour node marking.
 *
 * Colours:
 *   0 = WHITE  – not yet visited
 *   1 = GREY   – currently on the DFS path (in the recursion stack)
 *   2 = BLACK  – fully processed, no cycle found through this node
 *
 * A back-edge is detected when we try to visit a GREY node, meaning
 * we have found a path from a node back to one of its own ancestors.
 *
 * The stack stores pairs [node, isReturnVisit].
 *   – First visit  (isReturnVisit = false): mark GREY, push return marker, push children.
 *   – Return visit (isReturnVisit = true):  mark BLACK (done with this subtree).
 *
 * This faithfully simulates the call/return of recursive DFS without
 * recursion depth limits.
 *
 * @param {string}             startNode
 * @param {Map<string, string[]>} adjacency
 * @returns {boolean}  true if a directed cycle is reachable from startNode
 */
function detectCycle(startNode, adjacency) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map(); // default: WHITE (0) via Map.get returning undefined

  // Stack entries: [nodeName, isReturnVisit]
  const stack = [[startNode, false]];

  while (stack.length > 0) {
    const [node, isReturn] = stack.pop();

    if (isReturn) {
      // We're done with this node's subtree — mark it BLACK
      colour.set(node, BLACK);
      continue;
    }

    const currentColour = colour.get(node) ?? WHITE;

    if (currentColour === GREY) {
      // We reached a node that is still on the current path → cycle
      return true;
    }

    if (currentColour === BLACK) {
      // Already fully explored via a different path — safe to skip
      continue;
    }

    // Mark GREY: this node is now part of the active path
    colour.set(node, GREY);

    // Push a return marker so we can mark BLACK when we backtrack
    stack.push([node, true]);

    // Push children for exploration
    // (push in reverse order so that leftmost child is processed first,
    //  matching the behaviour of recursive DFS — not required for correctness
    //  but makes output deterministic)
    const children = adjacency.get(node) ?? [];
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      const childColour = colour.get(child) ?? WHITE;

      if (childColour === GREY) {
        // Child is already on the current path → back-edge → cycle
        return true;
      }
      if (childColour === WHITE) {
        stack.push([child, false]);
      }
      // BLACK children are already done — no need to revisit
    }
  }

  return false;
}

// ─── Step 5: Tree serialisation ───────────────────────────────────────────────

/**
 * Iterative post-order traversal that builds the nested tree object
 * AND computes the depth in a single pass.
 *
 * Depth = number of nodes on the longest root-to-leaf path.
 *   – A leaf node has depth 1.
 *   – A parent's depth = 1 + max(depth of its children).
 *
 * We use two stacks:
 *   – `toProcess`:  nodes waiting to have their children visited (pre-order push)
 *   – `toResolve`:  nodes waiting to compute their own depth once all
 *                   children have been resolved (post-order pop)
 *
 * Two maps track per-node results:
 *   – `subtreeOf`:  node -> its nested children object  { childName: {...}, ... }
 *   – `depthOf`:    node -> computed depth integer
 *
 * @param {string}             root
 * @param {Map<string, string[]>} adjacency
 * @returns {{ treeObj: object, depth: number }}
 */
function serialiseTree(root, adjacency) {
  const subtreeOf = new Map(); // node -> its children object
  const depthOf   = new Map(); // node -> depth

  // toProcess: nodes to visit in pre-order; toResolve: post-order queue
  const toProcess = [root];
  const toResolve = [];

  // Pre-order: record the traversal order
  while (toProcess.length > 0) {
    const node = toProcess.pop();
    toResolve.push(node);
    const children = adjacency.get(node) ?? [];
    for (const child of children) {
      toProcess.push(child);
    }
  }

  // Post-order: resolve depth and build subtreeOf bottom-up
  while (toResolve.length > 0) {
    const node = toResolve.pop();
    const children = adjacency.get(node) ?? [];

    if (children.length === 0) {
      // Leaf node
      subtreeOf.set(node, {});
      depthOf.set(node, 1);
    } else {
      const childObj  = {};
      let maxChildDepth = 0;

      for (const child of children) {
        childObj[child] = subtreeOf.get(child);
        const cd = depthOf.get(child) ?? 1;
        if (cd > maxChildDepth) maxChildDepth = cd;
      }

      subtreeOf.set(node, childObj);
      depthOf.set(node, 1 + maxChildDepth);
    }
  }

  return {
    treeObj: subtreeOf.get(root),
    depth:   depthOf.get(root),
  };
}

// ─── Step 6: Orchestration ────────────────────────────────────────────────────

/**
 * Main entry point.
 *
 * Takes the validated edge list and returns everything needed for the
 * API response body's hierarchy and summary sections.
 *
 * @param {Array<{ from: string, to: string, label: string }>} validEdges
 * @returns {{
 *   hierarchies:       object[],
 *   total_trees:       number,
 *   total_cycles:      number,
 *   largest_tree_root: string | null
 * }}
 */
function buildForest(validEdges) {
  // Edge case: no valid edges at all
  if (validEdges.length === 0) {
    return {
      hierarchies:       [],
      total_trees:       0,
      total_cycles:      0,
      largest_tree_root: null,
    };
  }

  // Step 1: Build adjacency and collect metadata
  const { adjacency, childNodes, allNodes } = buildAdjacency(validEdges);

  // Step 2: Partition nodes into connected components
  const components = findComponents(allNodes, validEdges);

  const hierarchies = [];
  let total_trees   = 0;
  let total_cycles  = 0;

  // Running tracker for largest non-cyclic tree
  let bestDepth         = -Infinity;
  let largest_tree_root = null;

  // Process each connected component independently
  for (const [, members] of components) {
    // Step 3: Find the root for this component
    const root = pickRoot(members, childNodes);

    // Step 4: Cycle check — runs on the directed graph from the chosen root
    const hasCycle = detectCycle(root, adjacency);

    if (hasCycle) {
      total_cycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
      continue;
    }

    // Step 5: Serialise tree and get depth
    const { treeObj, depth } = serialiseTree(root, adjacency);
    total_trees++;

    hierarchies.push({ root, tree: treeObj, depth });

    // Update largest-tree tracker
    // Tie-break: prefer lex-smaller root (earlier in alphabet)
    if (depth > bestDepth || (depth === bestDepth && root < largest_tree_root)) {
      bestDepth         = depth;
      largest_tree_root = root;
    }
  }

  // Sort output: non-cyclic trees first (lex by root), then cyclic groups (lex by root)
  hierarchies.sort((a, b) => {
    const aCyclic = a.has_cycle === true;
    const bCyclic = b.has_cycle === true;
    if (aCyclic !== bCyclic) return aCyclic ? 1 : -1; // trees before cycles
    return a.root < b.root ? -1 : 1;                  // lex within same category
  });

  return { hierarchies, total_trees, total_cycles, largest_tree_root };
}

module.exports = { buildForest };
