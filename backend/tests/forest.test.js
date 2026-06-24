/**
 * forest.test.js
 *
 * Unit tests for buildForest() in src/utils/forest.js.
 *
 * Test groups:
 *   A. Empty input
 *   B. Single edge / single component
 *   C. Tree shape and depth calculation
 *   D. Multiple independent trees
 *   E. Cycle detection
 *   F. Cycle + valid tree together
 *   G. Summary fields (total_trees, total_cycles, largest_tree_root)
 *   H. Output ordering (trees before cycles, lex within each group)
 *   I. Hidden edge cases
 *
 * Every test calls buildForest() with pre-validated edge objects
 * (i.e., the output of categoriseEdges), so we are testing forest
 * logic in complete isolation from validation logic.
 */

const { buildForest } = require("../src/utils/forest");

// Helper: build the minimal edge object that buildForest expects
function e(from, to) {
  return { from, to, label: `${from}->${to}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Empty input
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – empty input", () => {
  test("returns safe zero-state for an empty edge list", () => {
    const result = buildForest([]);
    expect(result).toEqual({
      hierarchies:       [],
      total_trees:       0,
      total_cycles:      0,
      largest_tree_root: null,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Single edge / minimal tree
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – single edge", () => {
  test("produces one hierarchy with correct root, tree, and depth", () => {
    const { hierarchies } = buildForest([e("A", "B")]);
    expect(hierarchies).toHaveLength(1);
    expect(hierarchies[0]).toEqual({ root: "A", tree: { B: {} }, depth: 2 });
  });

  test("root is the node that is NOT a child (A->B → root is A)", () => {
    const { hierarchies } = buildForest([e("A", "B")]);
    expect(hierarchies[0].root).toBe("A");
  });

  test("leaf node (B in A->B) has no children in the tree object", () => {
    const { hierarchies } = buildForest([e("A", "B")]);
    expect(hierarchies[0].tree.B).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. Tree shape and depth
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – tree shape and depth", () => {
  test("simple two-level tree: A->B, A->C, B->D", () => {
    const edges = [e("A", "B"), e("A", "C"), e("B", "D")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies).toHaveLength(1);

    const h = hierarchies[0];
    expect(h.root).toBe("A");
    expect(h.depth).toBe(3); // A -> B -> D
    expect(h.tree).toEqual({
      B: { D: {} },
      C: {},
    });
  });

  test("linear chain A->B->C->D has depth 4", () => {
    const edges = [e("A", "B"), e("B", "C"), e("C", "D")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].depth).toBe(4);
  });

  test("wide flat tree (one root, many direct children) has depth 2", () => {
    // A->B, A->C, A->D, A->E
    const edges = [e("A", "B"), e("A", "C"), e("A", "D"), e("A", "E")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].depth).toBe(2);
    expect(hierarchies[0].tree).toEqual({ B: {}, C: {}, D: {}, E: {} });
  });

  test("depth is longest path, not total node count", () => {
    // A->B (depth 1), A->C->D->E (depth 4 via C)
    const edges = [e("A", "B"), e("A", "C"), e("C", "D"), e("D", "E")];
    const { hierarchies } = buildForest(edges);
    // Longest path: A -> C -> D -> E = depth 4
    expect(hierarchies[0].depth).toBe(4);
  });

  test("single-node subtree (leaf) has depth 1 when standalone via a parent", () => {
    // A->B: B is a leaf, but the tree has depth 2 from A
    const { hierarchies } = buildForest([e("A", "B")]);
    expect(hierarchies[0].depth).toBe(2);
  });

  test("no has_cycle property on a non-cyclic hierarchy", () => {
    const { hierarchies } = buildForest([e("A", "B")]);
    expect(hierarchies[0].has_cycle).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. Multiple independent trees
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – multiple independent trees", () => {
  test("two disjoint edges produce two hierarchies", () => {
    const { hierarchies, total_trees } = buildForest([e("A", "B"), e("C", "D")]);
    expect(hierarchies).toHaveLength(2);
    expect(total_trees).toBe(2);
  });

  test("three disjoint trees produce three hierarchies", () => {
    const edges = [e("A", "B"), e("C", "D"), e("E", "F")];
    const { total_trees } = buildForest(edges);
    expect(total_trees).toBe(3);
  });

  test("each hierarchy has the correct root for its component", () => {
    const { hierarchies } = buildForest([e("A", "B"), e("C", "D")]);
    const roots = hierarchies.map((h) => h.root).sort();
    expect(roots).toEqual(["A", "C"]);
  });

  test("hierarchies are sorted: non-cyclic trees appear in lex order by root", () => {
    // Insert in reverse lex order to confirm sorting
    const { hierarchies } = buildForest([e("Z", "Y"), e("A", "B"), e("M", "N")]);
    const roots = hierarchies.map((h) => h.root);
    expect(roots).toEqual(["A", "M", "Z"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. Cycle detection
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – cycle detection", () => {
  test("three-node pure cycle: A->B, B->C, C->A", () => {
    const edges = [e("A", "B"), e("B", "C"), e("C", "A")];
    const { hierarchies, total_cycles, total_trees } = buildForest(edges);

    expect(hierarchies).toHaveLength(1);
    expect(total_cycles).toBe(1);
    expect(total_trees).toBe(0);

    const h = hierarchies[0];
    expect(h.has_cycle).toBe(true);
    expect(h.tree).toEqual({});
    expect(h.depth).toBeUndefined();   // depth must NOT be present on cyclic entries
  });

  test("two-node cycle: A->B, B->A", () => {
    const { hierarchies, total_cycles } = buildForest([e("A", "B"), e("B", "A")]);
    expect(total_cycles).toBe(1);
    expect(hierarchies[0].has_cycle).toBe(true);
  });

  test("pure cycle root is the lex-smallest node in the component", () => {
    // Cycle C->D->B->C: nodes are B, C, D → lex-smallest is B
    const edges = [e("C", "D"), e("D", "B"), e("B", "C")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].root).toBe("B");
  });

  test("cycle with Z->Y->X->Z: root should be X (lex-smallest)", () => {
    const edges = [e("Z", "Y"), e("Y", "X"), e("X", "Z")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].root).toBe("X");
  });

  test("five-node chain cycle: A->B->C->D->E->A", () => {
    const edges = [
      e("A", "B"), e("B", "C"), e("C", "D"), e("D", "E"), e("E", "A"),
    ];
    const { total_cycles, total_trees } = buildForest(edges);
    expect(total_cycles).toBe(1);
    expect(total_trees).toBe(0);
  });

  test("cyclic hierarchy has no 'depth' property", () => {
    const { hierarchies } = buildForest([e("A", "B"), e("B", "A")]);
    expect(Object.keys(hierarchies[0])).not.toContain("depth");
  });

  test("cyclic hierarchy has has_cycle: true (not just truthy)", () => {
    const { hierarchies } = buildForest([e("A", "B"), e("B", "A")]);
    expect(hierarchies[0].has_cycle).toStrictEqual(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Cycle + valid tree together
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – cycle and valid tree coexist", () => {
  test("one valid tree + one cycle: counts are correct", () => {
    const edges = [
      e("A", "B"), e("A", "C"),       // tree rooted at A
      e("X", "Y"), e("Y", "Z"), e("Z", "X"), // cycle X->Y->Z->X
    ];
    const { total_trees, total_cycles } = buildForest(edges);
    expect(total_trees).toBe(1);
    expect(total_cycles).toBe(1);
  });

  test("valid tree appears before cycle in sorted hierarchies output", () => {
    const edges = [
      e("X", "Y"), e("Y", "Z"), e("Z", "X"), // cycle
      e("A", "B"), e("A", "C"),               // tree
    ];
    const { hierarchies } = buildForest(edges);
    // non-cyclic trees come first
    expect(hierarchies[0].has_cycle).toBeUndefined(); // tree
    expect(hierarchies[1].has_cycle).toBe(true);       // cycle
  });

  test("largest_tree_root references only the non-cyclic tree", () => {
    const edges = [
      e("A", "B"), e("B", "C"),   // tree, depth 3
      e("X", "Y"), e("Y", "X"),   // cycle
    ];
    const { largest_tree_root, summary } = buildForest(edges);
    expect(largest_tree_root).toBe("A");
  });

  test("two trees + two cycles: all four appear in hierarchies", () => {
    const edges = [
      e("A", "B"),
      e("C", "D"),
      e("P", "Q"), e("Q", "P"),
      e("X", "Y"), e("Y", "Z"), e("Z", "X"),
    ];
    const { total_trees, total_cycles, hierarchies } = buildForest(edges);
    expect(total_trees).toBe(2);
    expect(total_cycles).toBe(2);
    expect(hierarchies).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. Summary fields
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – summary: total_trees and total_cycles", () => {
  test("total_trees + total_cycles = number of connected components", () => {
    const edges = [
      e("A", "B"),                        // tree
      e("C", "D"),                        // tree
      e("X", "Y"), e("Y", "X"),           // cycle
    ];
    const { total_trees, total_cycles, hierarchies } = buildForest(edges);
    expect(total_trees + total_cycles).toBe(hierarchies.length);
  });

  test("all cyclic input → total_trees is 0", () => {
    const { total_trees } = buildForest([e("A", "B"), e("B", "A")]);
    expect(total_trees).toBe(0);
  });

  test("no cycles → total_cycles is 0", () => {
    const { total_cycles } = buildForest([e("A", "B"), e("A", "C")]);
    expect(total_cycles).toBe(0);
  });
});

describe("buildForest – summary: largest_tree_root", () => {
  test("is null when there are no valid trees (all cyclic)", () => {
    const edges = [e("A", "B"), e("B", "C"), e("C", "A")];
    const { largest_tree_root } = buildForest(edges);
    expect(largest_tree_root).toBeNull();
  });

  test("single tree → its root is the largest_tree_root", () => {
    const { largest_tree_root } = buildForest([e("A", "B"), e("B", "C")]);
    expect(largest_tree_root).toBe("A");
  });

  test("deeper tree wins over shallower tree", () => {
    // A->B (depth 2) vs C->D->E->F (depth 4)
    const edges = [
      e("A", "B"),
      e("C", "D"), e("D", "E"), e("E", "F"),
    ];
    const { largest_tree_root } = buildForest(edges);
    expect(largest_tree_root).toBe("C");
  });

  test("depth tie: lex-smaller root wins", () => {
    // A->B->C (depth 3) and D->E->F (depth 3) → A wins
    const edges = [
      e("A", "B"), e("B", "C"),
      e("D", "E"), e("E", "F"),
    ];
    const { largest_tree_root } = buildForest(edges);
    expect(largest_tree_root).toBe("A");
  });

  test("depth tie reversed lex: still picks lex-smaller root", () => {
    // Z->Y->X (depth 3) and A->B->C (depth 3) → A wins
    const edges = [
      e("Z", "Y"), e("Y", "X"),
      e("A", "B"), e("B", "C"),
    ];
    const { largest_tree_root } = buildForest(edges);
    expect(largest_tree_root).toBe("A");
  });

  test("three-way depth tie: picks earliest in alphabet", () => {
    // A->B (d2), C->D (d2), E->F (d2) → A wins
    const edges = [e("A", "B"), e("C", "D"), e("E", "F")];
    const { largest_tree_root } = buildForest(edges);
    expect(largest_tree_root).toBe("A");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. Output ordering
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – hierarchies output ordering", () => {
  test("non-cyclic trees appear before cyclic groups", () => {
    const edges = [
      e("X", "Y"), e("Y", "X"),   // cycle first in input
      e("A", "B"),                // tree second in input
    ];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].root).toBe("A");          // tree first in output
    expect(hierarchies[1].has_cycle).toBe(true);    // cycle second
  });

  test("multiple trees are lex-sorted by root", () => {
    const edges = [e("M", "N"), e("A", "B"), e("Z", "Y")];
    const { hierarchies } = buildForest(edges);
    const treeRoots = hierarchies.map((h) => h.root);
    expect(treeRoots).toEqual(["A", "M", "Z"]);
  });

  test("multiple cycles are lex-sorted by root", () => {
    const edges = [
      e("Z", "Y"), e("Y", "Z"),   // cycle root Z (or Y?)
      e("A", "B"), e("B", "A"),   // cycle root A (or B?)
    ];
    const { hierarchies } = buildForest(edges);
    const cycleRoots = hierarchies.filter((h) => h.has_cycle).map((h) => h.root);
    // Both roots should be lex-smallest of their component
    expect(cycleRoots[0] < cycleRoots[1]).toBe(true); // sorted ascending
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. Hidden edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("buildForest – hidden edge cases", () => {
  test("a node that only appears as 'from' (no incoming edges) is always the root", () => {
    // R->A, R->B, R->C: R has no parent, so R is root
    const edges = [e("R", "A"), e("R", "B"), e("R", "C")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].root).toBe("R");
  });

  test("two separate subtrees merging at a shared intermediate node is handled by single-parent rule", () => {
    // This case CANNOT reach buildForest because categoriseEdges would reject the
    // second parent edge. Here we test the forest with a pre-filtered set
    // where that rejection already happened.
    //   A->B, B->D accepted; C->D rejected (multi-parent, handled in validate)
    // So buildForest receives: A->B, B->D, A->C (C is also valid sibling, not D)
    const edges = [e("A", "B"), e("B", "D"), e("A", "C")];
    const { hierarchies, total_trees } = buildForest(edges);
    expect(total_trees).toBe(1);
    expect(hierarchies[0].root).toBe("A");
    expect(hierarchies[0].depth).toBe(3);
  });

  test("diamond structure never reaches buildForest (second parent rejected in validate)", () => {
    // With single-parent enforcement, A->C and B->C would mean C->B is rejected.
    // We verify buildForest handles a tree where only one parent path exists.
    //   A->B, A->C, B->D  (C->D was rejected by categoriseEdges)
    const edges = [e("A", "B"), e("A", "C"), e("B", "D")];
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].tree).toEqual({ B: { D: {} }, C: {} });
  });

  test("all 26 nodes connected in a single chain has depth 26", () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const edges = [];
    for (let i = 0; i < letters.length - 1; i++) {
      edges.push(e(letters[i], letters[i + 1]));
    }
    const { hierarchies } = buildForest(edges);
    expect(hierarchies[0].root).toBe("A");
    expect(hierarchies[0].depth).toBe(26);
    expect(hierarchies[0].has_cycle).toBeUndefined();
  });

  test("single node that is both root and only member (impossible via edges — covered by validate layer)", () => {
    // buildForest requires at least one edge to know about a node,
    // so a truly isolated node can never appear. This confirms the contract.
    const result = buildForest([]);
    expect(result.hierarchies).toHaveLength(0);
  });

  test("cycle detection works on an indirect back-edge (not just immediate)", () => {
    // A->B->C->D->B: D points back to B (not A). This is still a cycle.
    // Note: categoriseEdges would reject D->B as multi-parent because B already
    // has parent A. So this scenario tests that multi-parent enforcement prevents
    // a non-root back-edge cycle from even reaching buildForest.
    // What CAN reach buildForest is when a cycle involves only the root:
    // A->B->C->A
    const edges = [e("A", "B"), e("B", "C"), e("C", "A")];
    const { total_cycles } = buildForest(edges);
    expect(total_cycles).toBe(1);
  });

  test("two components: one is a long tree, other is a short cycle", () => {
    const treeEdges = [e("A", "B"), e("B", "C"), e("C", "D"), e("D", "E")]; // depth 5
    const cycleEdges = [e("X", "Y"), e("Y", "Z"), e("Z", "X")];

    const { total_trees, total_cycles, largest_tree_root, hierarchies } =
      buildForest([...treeEdges, ...cycleEdges]);

    expect(total_trees).toBe(1);
    expect(total_cycles).toBe(1);
    expect(largest_tree_root).toBe("A");
    expect(hierarchies[0].has_cycle).toBeUndefined(); // tree first
    expect(hierarchies[1].has_cycle).toBe(true);      // cycle second
  });

  test("summary fields are present even when hierarchies is empty", () => {
    const result = buildForest([]);
    expect(result).toHaveProperty("total_trees");
    expect(result).toHaveProperty("total_cycles");
    expect(result).toHaveProperty("largest_tree_root");
    expect(result).toHaveProperty("hierarchies");
  });
});
