/**
 * validate.test.js
 *
 * Unit tests for parseEdge() and categoriseEdges() in src/utils/validate.js.
 *
 * Test groups:
 *   A. parseEdge  – individual string parsing
 *   B. categoriseEdges – full pipeline (valid / invalid / duplicate buckets)
 *
 * Coverage targets:
 *   - All explicitly listed invalid formats from the spec
 *   - Whitespace trimming (both ends, internal tabs/spaces)
 *   - Non-string input types (number, null, boolean, object, undefined)
 *   - Self-loop rejection
 *   - Exact-string duplicate handling (appears 3+ times → only ONE entry in duplicateEdges)
 *   - Multi-parent conflict (first parent wins, later edge → duplicateEdges)
 *   - Multi-parent edge appearing again after rejection (still rejected, still only ONE entry)
 *   - All 26 valid letter pairs at alphabet boundaries (A->B, Y->Z, Z->A, etc.)
 *   - Empty array input
 *   - Array with all invalid entries
 *   - Mixed valid + invalid + duplicates in one call
 */

const { parseEdge, categoriseEdges } = require("../src/utils/validate");

// ─────────────────────────────────────────────────────────────────────────────
// A. parseEdge
// ─────────────────────────────────────────────────────────────────────────────

describe("parseEdge – valid inputs", () => {
  test("accepts a basic valid edge", () => {
    const result = parseEdge("A->B");
    expect(result).toEqual({ ok: true, from: "A", to: "B", label: "A->B" });
  });

  test("trims leading whitespace before validating", () => {
    const result = parseEdge("   A->B");
    expect(result.ok).toBe(true);
    expect(result.label).toBe("A->B"); // label is the TRIMMED version
  });

  test("trims trailing whitespace before validating", () => {
    const result = parseEdge("A->B   ");
    expect(result.ok).toBe(true);
    expect(result.label).toBe("A->B");
  });

  test("trims both ends simultaneously", () => {
    const result = parseEdge("  Z->A  ");
    expect(result.ok).toBe(true);
    expect(result.from).toBe("Z");
    expect(result.to).toBe("A");
    expect(result.label).toBe("Z->A");
  });

  test("accepts first letters of the alphabet", () => {
    expect(parseEdge("A->B").ok).toBe(true);
  });

  test("accepts last letters of the alphabet", () => {
    expect(parseEdge("Y->Z").ok).toBe(true);
  });

  test("accepts Z->A (not a self-loop)", () => {
    expect(parseEdge("Z->A").ok).toBe(true);
  });

  test("extracts from and to correctly", () => {
    const { from, to } = parseEdge("M->P");
    expect(from).toBe("M");
    expect(to).toBe("P");
  });
});

describe("parseEdge – self-loops", () => {
  test("rejects A->A (self-loop)", () => {
    expect(parseEdge("A->A").ok).toBe(false);
    expect(parseEdge("A->A").label).toBe("A->A");
  });

  test("rejects Z->Z (self-loop at end of alphabet)", () => {
    expect(parseEdge("Z->Z").ok).toBe(false);
  });
});

describe("parseEdge – format violations", () => {
  test("rejects plain word with no arrow", () => {
    expect(parseEdge("hello").ok).toBe(false);
  });

  test("rejects digit-based edge", () => {
    expect(parseEdge("1->2").ok).toBe(false);
  });

  test("rejects two-char source (AB->C)", () => {
    expect(parseEdge("AB->C").ok).toBe(false);
  });

  test("rejects two-char destination (A->BC)", () => {
    expect(parseEdge("A->BC").ok).toBe(false);
  });

  test("rejects single-dash separator (A-B)", () => {
    expect(parseEdge("A-B").ok).toBe(false);
  });

  test("rejects fat-arrow separator (A=>B)", () => {
    expect(parseEdge("A=>B").ok).toBe(false);
  });

  test("rejects missing destination (A->)", () => {
    expect(parseEdge("A->").ok).toBe(false);
  });

  test("rejects missing source (->B)", () => {
    expect(parseEdge("->B").ok).toBe(false);
  });

  test("rejects empty string", () => {
    const r = parseEdge("");
    expect(r.ok).toBe(false);
    expect(r.label).toBe("");
  });

  test("rejects whitespace-only string (becomes empty after trim)", () => {
    const r = parseEdge("   ");
    expect(r.ok).toBe(false);
    expect(r.label).toBe(""); // trimmed to empty
  });

  test("rejects lowercase source (a->B)", () => {
    expect(parseEdge("a->B").ok).toBe(false);
  });

  test("rejects lowercase destination (A->b)", () => {
    expect(parseEdge("A->b").ok).toBe(false);
  });

  test("rejects mixed-case source (Ab->C)", () => {
    expect(parseEdge("Ab->C").ok).toBe(false);
  });
});

describe("parseEdge – non-string input types", () => {
  test("coerces number 42 to string '42', returns invalid", () => {
    const r = parseEdge(42);
    expect(r.ok).toBe(false);
    expect(r.label).toBe("42");
  });

  test("coerces null to string 'null', returns invalid", () => {
    const r = parseEdge(null);
    expect(r.ok).toBe(false);
    expect(r.label).toBe("null");
  });

  test("coerces undefined to string 'undefined', returns invalid", () => {
    const r = parseEdge(undefined);
    expect(r.ok).toBe(false);
    expect(r.label).toBe("undefined");
  });

  test("coerces boolean true to string 'true', returns invalid", () => {
    const r = parseEdge(true);
    expect(r.ok).toBe(false);
    expect(r.label).toBe("true");
  });

  test("coerces an object to its toString, returns invalid", () => {
    const r = parseEdge({ from: "A", to: "B" });
    expect(r.ok).toBe(false);
  });

  test("coerces a multi-element array to its toString (comma-joined), returns invalid", () => {
    // ["A->B", "C->D"].toString() → "A->B,C->D" — does not match EDGE_REGEX
    const r = parseEdge(["A->B", "C->D"]);
    expect(r.ok).toBe(false);
    expect(r.label).toBe("A->B,C->D");
  });

  test("NOTE: single-element array ['A->B'] coerces to 'A->B' which IS valid (JS behaviour)", () => {
    // This is a real hidden gotcha: String(["A->B"]) === "A->B"
    // The API guard (Array.isArray check on req.body.data) prevents arrays
    // from ever being individual elements, but this documents the behaviour.
    const r = parseEdge(["A->B"]);
    expect(r.ok).toBe(true); // coerces to "A->B" — a valid edge string
    expect(r.label).toBe("A->B");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. categoriseEdges
// ─────────────────────────────────────────────────────────────────────────────

describe("categoriseEdges – empty input", () => {
  test("returns three empty arrays for []", () => {
    const result = categoriseEdges([]);
    expect(result.validEdges).toEqual([]);
    expect(result.invalidEntries).toEqual([]);
    expect(result.duplicateEdges).toEqual([]);
  });
});

describe("categoriseEdges – all valid, no conflicts", () => {
  test("accepts a single edge", () => {
    const { validEdges, invalidEntries, duplicateEdges } =
      categoriseEdges(["A->B"]);
    expect(validEdges).toHaveLength(1);
    expect(validEdges[0]).toMatchObject({ from: "A", to: "B", label: "A->B" });
    expect(invalidEntries).toEqual([]);
    expect(duplicateEdges).toEqual([]);
  });

  test("accepts multiple non-conflicting edges", () => {
    const { validEdges } = categoriseEdges(["A->B", "A->C", "B->D"]);
    expect(validEdges).toHaveLength(3);
  });

  test("whitespace-padded entry is trimmed and accepted", () => {
    const { validEdges, invalidEntries } = categoriseEdges(["  A->B  "]);
    expect(validEdges).toHaveLength(1);
    expect(validEdges[0].label).toBe("A->B");
    expect(invalidEntries).toHaveLength(0);
  });

  test("tab-padded entry is trimmed and accepted", () => {
    const { validEdges } = categoriseEdges(["\tA->B\t"]);
    expect(validEdges).toHaveLength(1);
    expect(validEdges[0].label).toBe("A->B");
  });
});

describe("categoriseEdges – invalid entries", () => {
  test("all spec-listed invalid formats go to invalidEntries", () => {
    const inputs = ["hello", "1->2", "AB->C", "A-B", "A->", "A->A", ""];
    const { validEdges, invalidEntries, duplicateEdges } =
      categoriseEdges(inputs);

    expect(validEdges).toHaveLength(0);
    expect(duplicateEdges).toHaveLength(0);
    expect(invalidEntries).toHaveLength(7);

    // Check each invalid entry is stored with its trimmed form
    expect(invalidEntries).toContain("hello");
    expect(invalidEntries).toContain("1->2");
    expect(invalidEntries).toContain("AB->C");
    expect(invalidEntries).toContain("A-B");
    expect(invalidEntries).toContain("A->");
    expect(invalidEntries).toContain("A->A");
    expect(invalidEntries).toContain(""); // empty string after trim
  });

  test("non-string types are stored by their coerced string value in invalidEntries", () => {
    const { invalidEntries } = categoriseEdges([null, 42, true]);
    expect(invalidEntries).toContain("null");
    expect(invalidEntries).toContain("42");
    expect(invalidEntries).toContain("true");
  });

  test("whitespace-only entries appear as empty string in invalidEntries", () => {
    const { invalidEntries } = categoriseEdges(["   "]);
    expect(invalidEntries).toContain("");
  });
});

describe("categoriseEdges – exact-string duplicate edges", () => {
  test("second occurrence of same edge goes to duplicateEdges, first stays in validEdges", () => {
    const { validEdges, duplicateEdges } = categoriseEdges(["A->B", "A->B"]);
    expect(validEdges).toHaveLength(1);
    expect(validEdges[0].label).toBe("A->B");
    expect(duplicateEdges).toEqual(["A->B"]);
  });

  test("third occurrence of same edge does NOT add another entry to duplicateEdges", () => {
    // Appears 3 times → duplicateEdges should have only ONE entry for it
    const { duplicateEdges } = categoriseEdges(["A->B", "A->B", "A->B"]);
    expect(duplicateEdges).toHaveLength(1);
    expect(duplicateEdges).toEqual(["A->B"]);
  });

  test("fourth occurrence also does not duplicate the duplicateEdges entry", () => {
    const { duplicateEdges } = categoriseEdges([
      "A->B", "A->B", "A->B", "A->B",
    ]);
    expect(duplicateEdges.filter((e) => e === "A->B")).toHaveLength(1);
  });

  test("two different duplicated edges each appear once in duplicateEdges", () => {
    const { duplicateEdges } = categoriseEdges([
      "A->B", "C->D", "A->B", "C->D",
    ]);
    expect(duplicateEdges).toHaveLength(2);
    expect(duplicateEdges).toContain("A->B");
    expect(duplicateEdges).toContain("C->D");
  });

  test("whitespace variant is normalised before duplicate check", () => {
    // "  A->B  " and "A->B" have the same trimmed label → duplicate
    const { validEdges, duplicateEdges } = categoriseEdges([
      "A->B",
      "  A->B  ",
    ]);
    expect(validEdges).toHaveLength(1);
    expect(duplicateEdges).toEqual(["A->B"]);
  });
});

describe("categoriseEdges – multi-parent conflict", () => {
  test("second edge claiming the same child goes to duplicateEdges", () => {
    // A->B gives B its parent (A). C->B tries to give B a second parent.
    const { validEdges, duplicateEdges } = categoriseEdges([
      "A->B",
      "C->B", // B already has parent A → rejected
    ]);
    expect(validEdges).toHaveLength(1);
    expect(validEdges[0]).toMatchObject({ from: "A", to: "B" });
    expect(duplicateEdges).toContain("C->B");
  });

  test("third edge claiming the same child does NOT duplicate the duplicateEdges entry", () => {
    const { duplicateEdges } = categoriseEdges(["A->B", "C->B", "D->B"]);
    // Both C->B and D->B are rejected, each appears once in duplicateEdges
    expect(duplicateEdges).toContain("C->B");
    expect(duplicateEdges).toContain("D->B");
    expect(duplicateEdges.filter((e) => e === "C->B")).toHaveLength(1);
    expect(duplicateEdges.filter((e) => e === "D->B")).toHaveLength(1);
  });

  test("same multi-parent edge appearing twice stays in duplicateEdges only once", () => {
    // C->B rejected (multi-parent). Then C->B appears again → still rejected, still one entry.
    const { duplicateEdges } = categoriseEdges(["A->B", "C->B", "C->B"]);
    expect(duplicateEdges.filter((e) => e === "C->B")).toHaveLength(1);
  });

  test("multi-parent rule does not affect sibling edges from the same parent", () => {
    // A->B and A->C are fine: B and C each have only one parent (A)
    const { validEdges, duplicateEdges } = categoriseEdges([
      "A->B",
      "A->C",
    ]);
    expect(validEdges).toHaveLength(2);
    expect(duplicateEdges).toHaveLength(0);
  });

  test("order matters: first-encountered parent wins", () => {
    // B->D is accepted first. Then C->D tries to give D a second parent.
    const { validEdges, duplicateEdges } = categoriseEdges([
      "A->B", "A->C", "B->D", "C->D",
    ]);
    const dParent = validEdges.find((e) => e.to === "D");
    expect(dParent.from).toBe("B"); // B was first
    expect(duplicateEdges).toContain("C->D");
  });
});

describe("categoriseEdges – mixed input", () => {
  test("sorts a complex mixed array into all three buckets correctly", () => {
    const input = [
      "A->B",      // valid
      "A->C",      // valid
      "hello",     // invalid
      "A->B",      // exact duplicate
      "D->C",      // multi-parent (C already has parent A)
      "1->2",      // invalid
      "B->D",      // valid
      "B->D",      // exact duplicate
      "",          // invalid
    ];

    const { validEdges, invalidEntries, duplicateEdges } =
      categoriseEdges(input);

    expect(validEdges.map((e) => e.label)).toEqual(["A->B", "A->C", "B->D"]);
    expect(invalidEntries).toEqual(["hello", "1->2", ""]);
    expect(duplicateEdges).toContain("A->B");
    expect(duplicateEdges).toContain("D->C");
    expect(duplicateEdges).toContain("B->D");
    expect(duplicateEdges).toHaveLength(3);
  });

  test("preserves input order within each bucket", () => {
    const { invalidEntries } = categoriseEdges(["hello", "world", "1->2"]);
    expect(invalidEntries[0]).toBe("hello");
    expect(invalidEntries[1]).toBe("world");
    expect(invalidEntries[2]).toBe("1->2");
  });
});
