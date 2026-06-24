/**
 * api.js
 * Single source of truth for talking to the BFHL backend.
 * VITE_API_URL is injected at build time from .env
 */

// In production on Vercel, the API is hosted on the same origin under /api/index.js
// and rewritten to /bfhl at the root level.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

/**
 * POST /bfhl
 * @param {string[]} data  - array of raw edge strings
 * @returns {Promise<object>} parsed response body
 * @throws {Error} with a user-readable message on network or API errors
 */
export async function analyseEdges(data) {
  let response;

  try {
    response = await fetch(`${BASE_URL}/bfhl`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data }),
    });
  } catch (networkErr) {
    throw new Error(
      "Cannot reach the API. Make sure the backend is running and VITE_API_URL is correct."
    );
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `Server error (${response.status})`);
  }

  return json;
}
