/**
 * bfhl.routes.js
 *
 * Defines the two routes for the BFHL service:
 *
 *   GET  /health  – liveness probe (used by hosting platforms and smoke tests)
 *   POST /bfhl    – main analysis endpoint
 *
 * This file is intentionally thin: it handles only HTTP concerns (reading the
 * request body, calling the utility pipeline, shaping the response).
 * All business logic lives in utils/.
 */

const express = require("express");
const { categoriseEdges } = require("../utils/validate");
const { buildForest }     = require("../utils/forest");

const router = express.Router();

// ─── GET /health ──────────────────────────────────────────────────────────────
// Simple liveness check. Returns 200 with a timestamp.
// Hosting services (Render, Railway, etc.) poll this to decide if the
// dyno is alive before routing traffic.
router.get("/health", (_req, res) => {
  res.status(200).json({
    status:    "ok",
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /bfhl ───────────────────────────────────────────────────────────────
router.post("/bfhl", (req, res) => {

  // ── Guard: body must be a parsed JSON object ──────────────────────────────
  // If Content-Type header is missing, express.json() sets req.body to {}.
  // If the body is unparseable, express.json() returns 400 automatically.
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      error: "Request body must be a JSON object with a \"data\" array.",
    });
  }

  // ── Guard: data must be an array ──────────────────────────────────────────
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({
      error: "\"data\" must be an array of strings.",
    });
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────
  // Step 1: Validate and sort every raw element into a bucket
  const { validEdges, invalidEntries, duplicateEdges } = categoriseEdges(data);

  // Step 2: Build the forest and derive the summary
  const { hierarchies, total_trees, total_cycles, largest_tree_root } =
    buildForest(validEdges);

  // ── Response assembly ─────────────────────────────────────────────────────
  // Identity fields come from environment variables so the same codebase
  // can be submitted by different students without touching source code.
  return res.status(200).json({
    user_id:              process.env.USER_ID              || "jasmeengrewal_24062005",
    email_id:             process.env.EMAIL_ID             || "jasmeen.grewal@chitkara.edu.in",
    college_roll_number:  process.env.COLLEGE_ROLL_NUMBER  || "2310992396",
    hierarchies,
    invalid_entries:  invalidEntries,
    duplicate_edges:  duplicateEdges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  });
});

module.exports = router;
