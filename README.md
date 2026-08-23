# HR Policy Assistant

A chat-style assistant that answers employee questions about Leave, Attendance, and WFH policies — and validates leave applications against business rules.

**Live demo runs with zero API key** (mock LLM). Real OpenAI integration is one `.env` change away.

---

## How I Built It

### The core idea
Employees ask natural-language questions like "How many sick days do I get?" The app needs to find the right policy rule and answer from it — without hallucinating anything not in the policies.

I split this into two separate problems:
1. **Retrieval** — find the right policy chunk (no LLM needed here)
2. **Generation** — turn the chunk into a readable answer (LLM or mock)

Keeping them separate means the retrieval logic is testable and deterministic, and the LLM only ever sees pre-filtered, relevant context.

### Retrieval approach (TF-IDF + cosine similarity)
Built from scratch in `backend/retrieval.js` — no libraries, no vector DB, no API calls.

- Each policy rule is its own chunk (one rule = one entry in `data/policies.js`)
- At startup, every chunk is converted to a TF-IDF vector
- On each `/ask` request, the question is vectorised the same way and cosine similarity finds the best-matching chunk(s)
- An **out-of-scope gate** (confidence < 0.34) blocks the LLM entirely for questions the policies don't cover — the app says "I don't have that" instead of guessing

**Why not embeddings?** TF-IDF is fully offline, instant, and needs no API key. For this small policy set (12 chunks) it works well. Embeddings (e.g. `text-embedding-3-small`) would improve recall on paraphrased questions and are the natural next upgrade.

### Two LLM approaches (switchable via `.env`)

| Mode | What happens | When to use |
|---|---|---|
| `mock` (default) | Retrieved chunk templated into answer string, no API call | Demo, dev, no-key environments |
| `openai` | `gpt-4o-mini` called with strict grounding prompt | Production / real answers |

The function signature (`generateAnswer(question, chunks) → string`) is identical in both modes. `server.js` never needs to change.

### Leave validation
Fully deterministic — no LLM. Rules are coded directly in `leaveRules.js`:
- Date validation with clear error messages (rejects past dates, unrealistic years like 2020, dates > 1 year in future)
- 2-day advance notice for casual leave
- 90-day service requirement for casual leave
- Medical certificate note for sick leave > 2 days

---

## How to Run

### Backend
```bash
cd backend
npm install
node server.js
# -> http://localhost:5000  (mock LLM, no API key needed)
```

**To use real OpenAI:**
```bash
cp .env.example .env
# Edit .env: set LLM_MODE=openai and OPENAI_API_KEY=sk-...
node server.js
# Terminal will show: LLM mode: OPENAI (real API)
```

### Frontend (separate terminal)
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Try it
- "How many casual leaves do I get per year?"
- "What is the grace period for late arrival?"
- "Can I WFH 3 days a week?" (tests a limit)
- "What is the reimbursement policy?" (out-of-scope — should say no info)
- Apply for Leave button → try a past date or year 2020 (date validation)

---

## Project Structure

```
hr-app/
├── backend/
│   ├── data/policies.js     policy chunks (12 rules across 3 docs)
│   ├── retrieval.js          TF-IDF + cosine similarity (from scratch)
│   ├── llm.js                mock + real OpenAI — same interface
│   ├── leaveRules.js         date validation + leave business rules
│   ├── server.js             Express, /ask and /leave/apply routes
│   ├── .env.example          copy to .env, fill API key for real LLM
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           chat UI — questions + leave form
│   │   ├── api.js            fetch calls to backend
│   │   └── styles.css
│   └── package.json
├── PROMPTS.md                every LLM prompt used, with reasoning
├── .gitignore
└── README.md
```

---

## LLM / Provider Used

- **Default (mock):** No LLM — template-based, fully offline
- **Real LLM:** OpenAI `gpt-4o-mini` via official `openai` npm package

See `PROMPTS.md` for the exact system and user prompts, temperature settings, and reasoning behind each choice.

---

## What I'd Improve With More Time

1. **Embeddings-based retrieval** — replace TF-IDF with `text-embedding-3-small` (OpenAI) or a local model. Better recall on paraphrased questions ("how many days off do I get" → matches "casual leave: 12 days")

2. **Multi-turn conversation** — right now each question is independent. A real assistant would remember context ("how many? → how do I apply for them?")

3. **Load policies from actual .txt files** — currently hardcoded in `policies.js`. A file-watcher that re-indexes when policies change would make it production-ready

4. **Streaming responses** — for real LLM mode, stream tokens to frontend so users see the answer being typed (better UX for longer answers)

5. **Confidence calibration** — the 0.34 threshold is manually tuned. A small labelled eval set would let us pick the threshold that maximises precision/recall tradeoff

6. **Gemini/Claude fallback** — the `llm.js` architecture already supports adding more providers. Adding Gemini (`@google/generative-ai`) or Claude (`@anthropic-ai/sdk`) would be straightforward since the function signature stays the same

---

## Files NOT included (add these yourself)

- `backend/.env` — copy from `.env.example`, add your API key, never commit this
- `node_modules/` — run `npm install` in both `backend/` and `frontend/`
