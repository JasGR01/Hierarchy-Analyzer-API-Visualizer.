/**
 * validate.js
 *
 * Responsibility: take the raw `data` array from the request body and
 * sort every entry into one of three buckets:
 *
 *   validEdges    – accepted, structurally unique, single-parent edges
 *   invalidEntries – failed format/type check
 *   duplicateEdges – valid format but rejected (exact dup or multi-parent)
 *
 * Nothing in this file knows about trees, cycles, or depth.
 * It only enforces the per-edge rules described in the spec.
 */

// Matches exactly "X->Y" where X and Y are single A-Z letters.
// The self-loop guard (X === Y) is checked separately so we can give
// a clear reason for rejection if needed in future.
const EDGE_REGEX = /^([A-Z])->([A-Z])$/;

/**
 * Attempt to parse one raw element into a structured edge.
 *
 * Steps:
 *   1. Reject non-strings immediately (coerce to string for the error log).
 *   2. Trim whitespace.
 *   3. Test against EDGE_REGEX.
 *   4. Reject self-loops (A->A).
 *
 * @param {unknown} raw
 * @returns {{ ok: boolean, from: string, to: string, label: string }}
 *          `ok` is true only when the edge is structurally valid.
 *          `label` is always the trimmed string (used in error arrays).
 */
function parseEdge(raw) {
  // Coerce non-strings so we can store something meaningful in invalidEntries
  const coerced = typeof raw === "string" ? raw : String(raw);
  const trimmed = coerced.trim();

  const match = EDGE_REGEX.exec(trimmed);
  if (!match) {
    return { ok: false, from: "", to: "", label: trimmed };
  }

  const from = match[1];
  const to   = match[2];

  // Self-loop: A->A — explicitly invalid per spec
  if (from === to) {
    return { ok: false, from: "", to: "", label: trimmed };
  }

  return { ok: true, from, to, label: trimmed };
}

/**
 * Process the entire raw array in one pass and return the three buckets.
 *
 * Decision order for each element (must not be reordered):
 *   1. Does it pass `parseEdge`?          No  → invalidEntries
 *   2. Is the exact label already accepted? Yes → duplicateEdges (once)
 *   3. Does the child already have a parent? Yes → duplicateEdges (once)
 *   4. Accept the edge.
 *
 * Data structures used:
 *   acceptedLabels  – Set<string>  tracks which "X->Y" strings are already in validEdges
 *   rejectedLabels  – Set<string>  tracks which labels are already in duplicateEdges
 *                                  (prevents adding the same rejected label twice)
 *   parentOf        – Map<child, parent>  enforces single-parent rule
 *
 * @param {unknown[]} rawData
 * @returns {{
 *   validEdges:     Array<{ from: string, to: string, label: string }>,
 *   invalidEntries: string[],
 *   duplicateEdges: string[]
 * }}
 */
function categoriseEdges(rawData) {
  const validEdges     = [];
  const invalidEntries = [];
  const duplicateEdges = [];

  const acceptedLabels = new Set();  // labels of edges that made it into validEdges
  const rejectedLabels = new Set();  // labels already added to duplicateEdges
  const parentOf       = new Map();  // child node -> its assigned parent node

  for (const raw of rawData) {
    const { ok, from, to, label } = parseEdge(raw);

    // ── Step 1: Format / type check ──────────────────────────────────────────
    if (!ok) {
      invalidEntries.push(label);
      continue;
    }

    // ── Step 2: Exact-string duplicate check ──────────────────────────────────
    if (acceptedLabels.has(label)) {
      if (!rejectedLabels.has(label)) {
        duplicateEdges.push(label);
        rejectedLabels.add(label);
      }
      continue;
    }

    // ── Step 3: Multi-parent check ────────────────────────────────────────────
    // If `to` already has a parent from a previously accepted edge,
    // this edge is structurally rejected. The first-encountered parent wins.
    if (parentOf.has(to)) {
      if (!rejectedLabels.has(label)) {
        duplicateEdges.push(label);
        rejectedLabels.add(label);
      }
      // NOTE: we intentionally do NOT add this label to acceptedLabels.
      // A future identical label would hit step 2 only if it had been accepted.
      // Since it was never accepted, a future identical entry would hit step 3
      // again — which is correct behaviour (same result, still rejected).
      continue;
    }

    // ── Step 4: Accept ────────────────────────────────────────────────────────
    acceptedLabels.add(label);
    parentOf.set(to, from);
    validEdges.push({ from, to, label });
  }

  return { validEdges, invalidEntries, duplicateEdges };
}

module.exports = { parseEdge, categoriseEdges };
