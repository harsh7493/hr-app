# LLM Prompts Dump

This file documents every prompt used when calling a real LLM (OpenAI mode).
In mock mode, no prompts are sent — the retrieved chunk is templated directly.

---

## /ask endpoint — Policy Q&A (backend/llm.js → openaiGenerate)

### System Prompt
```
You are an HR policy assistant. 
Answer the employee's question using ONLY the policy text provided in the context below.
Do not add information that is not in the context.
If the context does not contain enough information to answer, say: "I don't have enough information in the policies to answer that."
Be concise — 1-3 sentences maximum.
```

### User Prompt (template — filled at runtime)
```
Context from HR policies:
[Leave Policy] Casual Leave: 12 days per year, accrued monthly (1 day/month), usable only after 90 days of service.
[Leave Policy] Leave applications must be submitted at least 2 days in advance, except sick leave which needs no advance notice.

Employee question: How many casual leaves do I get?

Answer:
```

### Why these choices

- **System prompt is strict ("ONLY the policy text")** — prevents hallucination. The LLM is not allowed to use its training knowledge about HR policies in general, only the retrieved chunks.
- **Temperature = 0.2** — low value means factual, less creative. High temperature would give varied/creative answers which is wrong for policy Q&A.
- **max_tokens = 150** — forces concise answers. Policy answers should be short and to the point.
- **gpt-4o-mini** — cheaper and fast enough for this use case. gpt-4o would be overkill for simple factual policy retrieval.
- **Context format: `[Doc Name] chunk text`** — labelling the source document in context helps the model attribute correctly.

---

## Retrieval (no LLM involved — pure TF-IDF)

The retrieval step uses **TF-IDF + cosine similarity**, built from scratch in `backend/retrieval.js`. No external API or LLM is called here.

The LLM only sees the **top 1-2 retrieved chunks** (same document), not the entire policy. This is intentional:
- Keeps the context small → faster + cheaper API calls
- Forces the answer to be grounded in the most relevant chunk
- Reduces confusion from unrelated policy text

---

## Leave Validation (no LLM)

Leave application validation (`backend/leaveRules.js`) is fully deterministic — no prompts, no LLM. Date validation, advance notice rules, and service-day checks are all coded directly. This is intentional — deterministic rules should never go through an LLM because the LLM might get them wrong.

---

## Out-of-scope gate (no LLM)

If the TF-IDF retrieval confidence score < 0.34, the LLM is never called.
The app directly returns: `"I don't have information on that in the available policies."`
This prevents the LLM from hallucinating answers to questions the policies don't cover.
