/**
 * api.test.js
 *
 * Integration tests for the HTTP layer: POST /bfhl and GET /health.
 * Uses Supertest to make real HTTP requests against the Express app
 * without starting a live server on a port.
 *
 * Test groups:
 *   A. GET /health
 *   B. POST /bfhl – request validation (bad payloads)
 *   C. POST /bfhl – response structure (required fields always present)
 *   D. POST /bfhl – correct bucketing through the full pipeline
 *   E. POST /bfhl – CORS headers
 *   F. POST /bfhl – unknown route returns 404
 */

const request  = require("supertest");
const app      = require("../src/index");

// ─────────────────────────────────────────────────────────────────────────────
// A. GET /health
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  test("returns 200 with status: ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("includes a valid ISO-8601 timestamp", async () => {
    const res = await request(app).get("/health");
    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. POST /bfhl – request validation
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /bfhl – bad request handling", () => {
  test("returns 400 when request body is missing entirely", async () => {
    const res = await request(app)
      .post("/bfhl")
      .set("Content-Type", "application/json")
      .send(); // empty body
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when 'data' key is absent", async () => {
    const res = await request(app)
      .post("/bfhl")
      .send({ nodes: ["A->B"] }); // wrong key
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("returns 400 when 'data' is a string instead of array", async () => {
    const res = await request(app)
      .post("/bfhl")
      .send({ data: "A->B" });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when 'data' is a number", async () => {
    const res = await request(app)
      .post("/bfhl")
      .send({ data: 42 });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when 'data' is null", async () => {
    const res = await request(app)
      .post("/bfhl")
      .send({ data: null });
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when body is a top-level array (not an object)", async () => {
    const res = await request(app)
      .post("/bfhl")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(["A->B"])); // body is array, not {data:[...]}
    // Express still parses this — data key won't exist
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. POST /bfhl – response structure
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /bfhl – response always contains all required fields", () => {
  async function post(data) {
    return request(app).post("/bfhl").send({ data });
  }

  test("empty array returns 200 with all required keys", async () => {
    const res = await post([]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("user_id");
    expect(res.body).toHaveProperty("email_id");
    expect(res.body).toHaveProperty("college_roll_number");
    expect(res.body).toHaveProperty("hierarchies");
    expect(res.body).toHaveProperty("invalid_entries");
    expect(res.body).toHaveProperty("duplicate_edges");
    expect(res.body).toHaveProperty("summary");
    expect(res.body.summary).toHaveProperty("total_trees");
    expect(res.body.summary).toHaveProperty("total_cycles");
    expect(res.body.summary).toHaveProperty("largest_tree_root");
  });

  test("user_id is a non-empty string", async () => {
    const res = await post([]);
    expect(typeof res.body.user_id).toBe("string");
    expect(res.body.user_id.length).toBeGreaterThan(0);
  });

  test("user_id matches the fullname_ddmmyyyy format pattern", async () => {
    const res = await post([]);
    // Pattern: one or more lowercase letters, underscore, 8 digits
    expect(res.body.user_id).toMatch(/^[a-z]+_\d{8}$/);
  });

  test("email_id is a non-empty string", async () => {
    const res = await post([]);
    expect(typeof res.body.email_id).toBe("string");
    expect(res.body.email_id.length).toBeGreaterThan(0);
  });

  test("college_roll_number is a non-empty string", async () => {
    const res = await post([]);
    expect(typeof res.body.college_roll_number).toBe("string");
    expect(res.body.college_roll_number.length).toBeGreaterThan(0);
  });

  test("hierarchies is always an array", async () => {
    const res = await post([]);
    expect(Array.isArray(res.body.hierarchies)).toBe(true);
  });

  test("invalid_entries is always an array", async () => {
    const res = await post([]);
    expect(Array.isArray(res.body.invalid_entries)).toBe(true);
  });

  test("duplicate_edges is always an array", async () => {
    const res = await post([]);
    expect(Array.isArray(res.body.duplicate_edges)).toBe(true);
  });

  test("summary.total_trees is a number", async () => {
    const res = await post([]);
    expect(typeof res.body.summary.total_trees).toBe("number");
  });

  test("summary.total_cycles is a number", async () => {
    const res = await post([]);
    expect(typeof res.body.summary.total_cycles).toBe("number");
  });

  test("summary.largest_tree_root is null for empty input", async () => {
    const res = await post([]);
    expect(res.body.summary.largest_tree_root).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. POST /bfhl – end-to-end correctness through full pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /bfhl – end-to-end pipeline correctness", () => {
  async function post(data) {
    return request(app).post("/bfhl").send({ data });
  }

  test("simple tree: A->B, A->C, B->D", async () => {
    const res = await post(["A->B", "A->C", "B->D"]);
    expect(res.statusCode).toBe(200);

    const { hierarchies, invalid_entries, duplicate_edges, summary } = res.body;
    expect(hierarchies).toHaveLength(1);
    expect(hierarchies[0].root).toBe("A");
    expect(hierarchies[0].depth).toBe(3);
    expect(hierarchies[0].tree).toEqual({ B: { D: {} }, C: {} });
    expect(invalid_entries).toEqual([]);
    expect(duplicate_edges).toEqual([]);
    expect(summary.total_trees).toBe(1);
    expect(summary.total_cycles).toBe(0);
    expect(summary.largest_tree_root).toBe("A");
  });

  test("multiple trees: A->B, C->D", async () => {
    const res = await post(["A->B", "C->D"]);
    expect(res.body.summary.total_trees).toBe(2);
    expect(res.body.hierarchies).toHaveLength(2);
    expect(res.body.summary.largest_tree_root).toBe("A"); // tie-break by lex
  });

  test("all invalid entries: returns them in invalid_entries, no hierarchies", async () => {
    const res = await post(["hello", "1->2", "AB->C", "A-B", ""]);
    expect(res.body.invalid_entries).toHaveLength(5);
    expect(res.body.hierarchies).toHaveLength(0);
    expect(res.body.duplicate_edges).toHaveLength(0);
  });

  test("whitespace-padded valid edge is accepted, not rejected", async () => {
    const res = await post(["  A->B  "]);
    expect(res.body.invalid_entries).toHaveLength(0);
    expect(res.body.hierarchies).toHaveLength(1);
  });

  test("exact duplicate edge appears in duplicate_edges, once only", async () => {
    const res = await post(["A->B", "A->B", "A->B"]);
    expect(res.body.duplicate_edges).toEqual(["A->B"]);
    expect(res.body.hierarchies).toHaveLength(1);
  });

  test("multi-parent conflict: C->D rejected when B->D already accepted", async () => {
    const res = await post(["A->B", "A->C", "B->D", "C->D"]);
    expect(res.body.duplicate_edges).toContain("C->D");
    // D's parent should be B (first encountered)
    const dEntry = Object.entries(res.body.hierarchies[0].tree.B);
    expect(dEntry.map(([k]) => k)).toContain("D");
  });

  test("pure cycle: has_cycle true, no depth, root is lex-smallest", async () => {
    const res = await post(["B->C", "C->A", "A->B"]); // cycle, lex-smallest is A
    const h = res.body.hierarchies[0];
    expect(h.has_cycle).toBe(true);
    expect(h.root).toBe("A");
    expect(h.depth).toBeUndefined();
    expect(res.body.summary.total_cycles).toBe(1);
    expect(res.body.summary.largest_tree_root).toBeNull();
  });

  test("depth tie → lex-smaller root is largest_tree_root", async () => {
    // A->B->C (depth 3) and D->E->F (depth 3) → A
    const res = await post(["A->B", "B->C", "D->E", "E->F"]);
    expect(res.body.summary.largest_tree_root).toBe("A");
  });

  test("mixed: valid + invalid + duplicate + cycle all together", async () => {
    const input = [
      "A->B",          // valid
      "A->C",          // valid
      "X->Y",          // valid (separate tree/cycle)
      "Y->Z",          // valid
      "Z->X",          // valid → cycle X->Y->Z->X
      "A->B",          // duplicate
      "hello",         // invalid
      "1->2",          // invalid
    ];
    const res = await post(input);

    expect(res.body.invalid_entries).toHaveLength(2);
    expect(res.body.duplicate_edges).toContain("A->B");
    expect(res.body.summary.total_trees).toBe(1);   // A component
    expect(res.body.summary.total_cycles).toBe(1);  // X->Y->Z->X
    expect(res.body.summary.largest_tree_root).toBe("A");

    // Trees come before cycles in hierarchies
    const roots = res.body.hierarchies.map((h) => h.root);
    expect(roots[0]).toBe("A"); // tree first
    const cycleHierarchy = res.body.hierarchies.find((h) => h.has_cycle);
    expect(cycleHierarchy).toBeDefined();
    expect(cycleHierarchy.root).toBe("X");
  });

  test("self-loop A->A goes to invalid_entries, not duplicate_edges", async () => {
    const res = await post(["A->A"]);
    expect(res.body.invalid_entries).toContain("A->A");
    expect(res.body.duplicate_edges).toHaveLength(0);
  });

  test("26-letter chain produces depth 26", async () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const data = [];
    for (let i = 0; i < letters.length - 1; i++) {
      data.push(`${letters[i]}->${letters[i + 1]}`);
    }
    const res = await post(data);
    expect(res.body.hierarchies[0].depth).toBe(26);
    expect(res.body.hierarchies[0].root).toBe("A");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. CORS headers
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /bfhl – CORS", () => {
  test("response includes Access-Control-Allow-Origin: *", async () => {
    const res = await request(app)
      .post("/bfhl")
      .send({ data: [] });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  test("OPTIONS preflight request returns 204 with correct headers", async () => {
    const res = await request(app)
      .options("/bfhl")
      .set("Origin", "https://example.com")
      .set("Access-Control-Request-Method", "POST");
    // The cors middleware handles OPTIONS → 204 or 200
    expect([200, 204]).toContain(res.statusCode);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Unknown routes
// ─────────────────────────────────────────────────────────────────────────────

describe("Unknown routes", () => {
  test("GET /unknown returns 404", async () => {
    const res = await request(app).get("/unknown");
    expect(res.statusCode).toBe(404);
  });

  test("POST /unknown returns 404", async () => {
    const res = await request(app).post("/unknown").send({ data: [] });
    expect(res.statusCode).toBe(404);
  });

  test("GET /bfhl (wrong method) returns 404", async () => {
    const res = await request(app).get("/bfhl");
    expect(res.statusCode).toBe(404);
  });
});
