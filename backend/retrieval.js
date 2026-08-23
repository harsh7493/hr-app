/**
 * retrieval.js
 * ------------
 * Real TF-IDF + cosine similarity retrieval - built from scratch, no
 * libraries (no scikit-learn, no vector DB). This is the same underlying
 * math a "real" RAG system uses for keyword-based retrieval; embeddings
 * (see chat explanation) are a further upgrade on top of this same idea.
 *
 * -----------------------------------------------------------------------
 * THE IDEA, IN PLAIN WORDS
 * -----------------------------------------------------------------------
 * We want to turn every policy chunk AND the user's question into a
 * vector (a list of numbers), then measure how "close" those vectors are.
 * Close vector = relevant chunk.
 *
 * TF-IDF decides what each number in the vector should be:
 *   - TF  (Term Frequency)      -> how often a word appears in THIS chunk.
 *                                   More mentions = more important to this chunk.
 *   - IDF (Inverse Doc Frequency) -> how RARE a word is across ALL chunks.
 *                                   A word that appears in every chunk (like
 *                                   "leave" if every policy mentions it) is
 *                                   less useful for telling chunks apart than
 *                                   a rare word like "grace" or "punch-in".
 *   TF-IDF score = TF * IDF -> high when a word is frequent in THIS chunk
 *                              but rare across OTHER chunks. That's exactly
 *                              what makes a word a good "fingerprint" for
 *                              a specific chunk.
 *
 * Once every chunk has a TF-IDF vector, we do the same for the question,
 * then use COSINE SIMILARITY to measure the angle between the question's
 * vector and each chunk's vector. Smaller angle (closer to 1.0) = more
 * relevant. This needs no external API call and runs instantly.
 * -----------------------------------------------------------------------
 */

const policies = require("./data/policies");

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "do", "does", "i", "my", "me", "can",
  "how", "what", "for", "to", "of", "in", "on", "per", "get", "many",
  "if", "and", "or", "it", "be", "am", "im", "will", "would", "should",
]);

// Very small stemmer: just strips a trailing "s" (e.g. "leaves" -> "leave",
// "days" -> "day", "arrivals" -> "arrival"). Without this, "leaves" in a
// question would NOT match "leave" in the policy text at all, since TF-IDF
// works on exact tokens - a real bug we hit while testing this file (see
// chat). A real system would use a proper stemmer (e.g. Porter stemmer) or
// embeddings, which don't have this problem at all - see chat explanation.
function stem(word) {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

// -----------------------------------------------------------------------
// STEP 1: Build the vocabulary (every unique word across all chunks)
// -----------------------------------------------------------------------
// We need every chunk's vector to use the SAME word order, otherwise
// comparing vectors wouldn't make sense (position 3 must mean the same
// word in every vector).
function buildVocabulary(documents) {
  const vocabSet = new Set();
  documents.forEach((doc) => {
    tokenize(doc.text).forEach((word) => vocabSet.add(word));
  });
  return Array.from(vocabSet); // fixed order, e.g. ["casual","leave","days",...]
}

// -----------------------------------------------------------------------
// STEP 2: IDF - how rare is each word across the whole document set?
// -----------------------------------------------------------------------
// idf(word) = log( totalDocuments / documentsContainingWord )
// A word in every chunk -> ratio close to 1 -> log close to 0 -> low weight.
// A word in only 1 chunk -> high ratio -> high log -> high weight.
function computeIDF(documents, vocabulary) {
  const idf = {};
  const N = documents.length;

  vocabulary.forEach((word) => {
    const docsWithWord = documents.filter((doc) =>
      tokenize(doc.text).includes(word)
    ).length;
    // +1 smoothing to avoid divide-by-zero if a word were somehow absent everywhere
    idf[word] = Math.log(N / (docsWithWord + 1)) + 1;
  });

  return idf;
}

// -----------------------------------------------------------------------
// STEP 3: TF - how often does each word appear WITHIN one piece of text?
// -----------------------------------------------------------------------
// tf(word, text) = count(word in text) / totalWordsInText
// Dividing by total length stops long chunks from automatically scoring
// higher just because they contain more words.
function computeTF(words) {
  const tf = {};
  words.forEach((word) => {
    tf[word] = (tf[word] || 0) + 1;
  });
  Object.keys(tf).forEach((word) => {
    tf[word] = tf[word] / words.length;
  });
  return tf;
}

// -----------------------------------------------------------------------
// STEP 4: Turn a TF map into a full vector aligned to the vocabulary order
// -----------------------------------------------------------------------
function toVector(words, vocabulary, idf) {
  const tf = computeTF(words);
  return vocabulary.map((word) => (tf[word] || 0) * (idf[word] || 0));
}

// -----------------------------------------------------------------------
// STEP 5: Cosine similarity - the angle between two vectors
// -----------------------------------------------------------------------
// cos(angle) = (A . B) / (|A| * |B|)
//   A . B  = dot product (multiply matching positions, sum them up)
//   |A|    = magnitude (length) of vector A
// Result ranges 0 (completely unrelated) to 1 (identical direction/topic).
function cosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  if (magA === 0 || magB === 0) return 0; // no shared vocabulary at all
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// -----------------------------------------------------------------------
// Build the index ONCE at startup (not on every request) - this is the
// expensive-ish part (vocabulary + IDF + every chunk's vector), so we
// cache it in memory and reuse it for every /ask call.
// -----------------------------------------------------------------------
const vocabulary = buildVocabulary(policies);
const idf = computeIDF(policies, vocabulary);
const chunkVectors = policies.map((doc) => ({
  ...doc,
  vector: toVector(tokenize(doc.text), vocabulary, idf),
}));

// -----------------------------------------------------------------------
// PUBLIC API: search(question) -> ranked chunks with similarity scores
// -----------------------------------------------------------------------
function search(question, topK = 3) {
  const qWords = tokenize(question);
  if (qWords.length === 0) return [];

  const qVector = toVector(qWords, vocabulary, idf);

  const scored = chunkVectors.map((chunk) => ({
    id: chunk.id,
    doc: chunk.doc,
    text: chunk.text,
    score: cosineSimilarity(qVector, chunk.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = { search };
