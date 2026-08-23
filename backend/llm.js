/**
 * llm.js
 * ------
 * Two approaches in one file:
 *
 * Approach A — Mock LLM (default, no API key needed)
 *   Templates the retrieved chunk directly into an answer string.
 *   The full retrieval -> grounding -> response pipeline is IDENTICAL
 *   to the real version. Only this final "generation" step is simulated.
 *   Use this to demo the app with zero cost and zero setup.
 *
 * Approach B — Real OpenAI LLM (set OPENAI_API_KEY in .env)
 *   Calls gpt-4o-mini with a strict grounding prompt — the model is
 *   told to answer ONLY from the retrieved context, never to make things
 *   up. This is the "production" approach; identical call signature.
 *
 * Which one runs is decided by LLM_MODE in .env:
 *   LLM_MODE=mock   -> Approach A (default if not set)
 *   LLM_MODE=openai -> Approach B
 *
 * Nothing in server.js needs to change when switching modes.
 * Just set the env var and restart.
 */

require("dotenv").config();

const MODE = (process.env.LLM_MODE || "mock").toLowerCase();

// -----------------------------------------------------------------------
// Approach A: Mock LLM
// Templates retrieved chunks into a readable answer with zero API calls.
// -----------------------------------------------------------------------
function mockGenerate(question, chunks) {
  const combined = chunks.map((c) => c.text).join(" ");
  return `Based on the ${chunks[0].doc}: ${combined}`;
}

// -----------------------------------------------------------------------
// Approach B: Real OpenAI LLM
// Strict grounding prompt — model must answer from context only.
// -----------------------------------------------------------------------
async function openaiGenerate(question, chunks) {
  const OpenAI = require("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const context = chunks.map((c) => `[${c.doc}] ${c.text}`).join("\n");

  // PROMPT DUMP (also in PROMPTS.md):
  // System prompt forces the model to stay grounded — no hallucination.
  // User prompt gives it the retrieved context + the actual question.
  const systemPrompt = `You are an HR policy assistant. 
Answer the employee's question using ONLY the policy text provided in the context below.
Do not add information that is not in the context.
If the context does not contain enough information to answer, say: "I don't have enough information in the policies to answer that."
Be concise — 1-3 sentences maximum.`;

  const userPrompt = `Context from HR policies:
${context}

Employee question: ${question}

Answer:`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2, // low temperature = more factual, less creative
      max_tokens: 150,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI call failed:", err.message);
    // Graceful fallback to mock if real LLM fails
    return mockGenerate(question, chunks);
  }
}

// -----------------------------------------------------------------------
// Public API — same signature regardless of mode
// server.js calls this and never needs to know which mode is active.
// -----------------------------------------------------------------------
async function generateAnswer(question, chunks) {
  if (MODE === "openai" && process.env.OPENAI_API_KEY) {
    return await openaiGenerate(question, chunks);
  }
  // Default: mock (no await needed, sync function)
  return mockGenerate(question, chunks);
}

module.exports = { generateAnswer, MODE };
