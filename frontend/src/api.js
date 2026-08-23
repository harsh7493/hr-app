/**
 * api.js
 * ------
 * All calls to the backend go through here, so App.jsx doesn't need to know
 * about fetch/URLs directly - just call askQuestion(...) or applyLeave(...).
 */

const BASE_URL = "http://localhost:5000";

export async function askQuestion(question) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return res.json();
}

export async function applyLeave(payload) {
  const res = await fetch(`${BASE_URL}/leave/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
