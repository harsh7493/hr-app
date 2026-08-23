/**
 * server.js
 * ---------
 * Express backend. Two routes:
 *   POST /ask          -> Q&A over the policy docs (mock or real LLM via llm.js)
 *   POST /leave/apply  -> Rule-based leave validation (no LLM, deterministic)
 *
 * Run:
 *   npm install
 *   node server.js          (mock LLM, no API key needed)
 *
 *   OR with real LLM:
 *   LLM_MODE=openai OPENAI_API_KEY=sk-... node server.js
 *   (or set these in .env file)
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { search } = require("./retrieval");
const { generateAnswer, MODE } = require("./llm");           // unified LLM module
const { evaluateLeaveApplication } = require("./leaveRules");

const app = express();
app.use(cors());
app.use(express.json());

// Below this retrieval-confidence score we treat the question as out-of-scope
// and never call the LLM (prevents hallucination on uncovered topics).
const CONFIDENCE_THRESHOLD = 0.34;

// Log which LLM mode is active at startup so it's obvious from the terminal
console.log(`LLM mode: ${MODE.toUpperCase()} ${MODE === "openai" ? "(real API)" : "(mock/dummy)"}`);

// -----------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------
app.get("/health", (req, res) => res.json({ status: "ok", llmMode: MODE }));

// -----------------------------------------------------------------------
// POST /ask
// -----------------------------------------------------------------------
app.post("/ask", async (req, res) => {
  const question = (req.body.question || "").trim();

  if (!question) {
    return res.status(400).json({ error: "'question' is required and cannot be empty." });
  }

  const results = search(question, 3);
  const topScore = results.length > 0 ? results[0].score : 0;

  // Out-of-scope gate
  if (topScore < CONFIDENCE_THRESHOLD) {
    return res.json({
      question,
      answer: "I don't have information on that in the available policies.",
      source: null,
      in_scope: false,
      confidence: Number(topScore.toFixed(2)),
    });
  }

  const topChunk = results[0];
  const supportingChunks = results.filter((r) => r.doc === topChunk.doc).slice(0, 2);

  // generateAnswer is async (real LLM), mock also returns instantly
  const answer = await generateAnswer(question, supportingChunks);

  return res.json({
    question,
    answer,
    source: topChunk.doc,
    in_scope: true,
    confidence: Number(topChunk.score.toFixed(2)),
    llmMode: MODE,
  });
});

// -----------------------------------------------------------------------
// POST /leave/apply
// -----------------------------------------------------------------------
app.post("/leave/apply", (req, res) => {
  const { leaveType, startDate, endDate, appliedDate, joinDate } = req.body;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({
      error: "leaveType, startDate, and endDate are required.",
    });
  }

  const result = evaluateLeaveApplication({ leaveType, startDate, endDate, appliedDate, joinDate });
  return res.json(result);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
