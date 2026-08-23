/**
 * mockLLM.js
 * ----------
 * STAND-IN for a real LLM call (e.g. Claude/OpenAI API).
 *
 * In the real project, this file would call the Anthropic API with a system
 * prompt like "answer using ONLY this retrieved text". Here, instead of
 * calling a real model, we just template the retrieved chunk(s) straight
 * into a sentence - so the whole app is demoable with zero API key / zero
 * cost, and the REST of the pipeline (retrieval -> grounding -> response
 * shape) is identical to the real version.
 *
 * Swapping this for a real LLM later = replace the body of generateAnswer()
 * with an actual API call that sends `chunks` as context. Nothing in
 * server.js needs to change, since the function signature
 * (question, chunks[]) -> answer string stays the same.
 */

function generateAnswer(question, chunks) {
  // A real LLM would blend multiple chunks into one natural sentence.
  // We fake that by just joining them, clearly labelled, so it's obvious
  // this is NOT a real generative call, just a stand-in.
  const combined = chunks.map((c) => c.text).join(" ");
  return `Based on the ${chunks[0].doc}: ${combined}`;
}

module.exports = { generateAnswer };
