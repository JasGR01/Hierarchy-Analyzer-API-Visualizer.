/**
 * index.js
 *
 * Express server entry point for the BFHL API.
 *
 * Middleware stack (in order):
 *   1. CORS             – allow any origin (evaluator calls from external host)
 *   2. express.json()   – parse application/json bodies
 *   3. Routes           – /health and /bfhl
 *   4. 404 handler      – catch-all for unknown paths
 *
 * Environment variables (see .env.example):
 *   PORT                – listen port, defaults to 3001
 *   USER_ID             – returned in every response
 *   EMAIL_ID            – returned in every response
 *   COLLEGE_ROLL_NUMBER – returned in every response
 */

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const bfhlRouter = require("./routes/bfhl.routes");

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS: evaluator calls from a different origin so we must allow all.
// Preflight OPTIONS requests are handled automatically by the cors package.
app.use(cors({
  origin:         "*",
  methods:        ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// JSON body parser — 100kb is generous but not exploitable.
app.use(express.json({ limit: "100kb" }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/", bfhlRouter);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found. Valid endpoints: GET /health, POST /bfhl" });
});

// ─── Start (local only) ───────────────────────────────────────────────────────
//
// require.main === module is true only when Node runs this file directly:
//   node src/index.js
//
// When Vercel imports this file as a serverless function handler, or when
// Jest/Supertest require() it for integration tests, this block is skipped —
// the caller just receives the Express `app` export.

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[BFHL] Server started on port ${PORT}`);
    console.log(`[BFHL] Health : http://localhost:${PORT}/health`);
    console.log(`[BFHL] API    : POST http://localhost:${PORT}/bfhl`);
  });
}

// Export for Vercel serverless handler, Jest/Supertest, and any future importer
module.exports = app;
