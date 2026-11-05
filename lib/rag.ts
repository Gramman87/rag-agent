import Anthropic from "@anthropic-ai/sdk";
import { DOCUMENTS, Document } from "./documents";
import type { Embedder } from "./embeddings";

export interface Chunk {
  id: string;
  docId: string;
  docTitle: string;
  source: string;
  text: string;
  score?: number;
}

// Each document is a series of titled paragraphs ("Rate Limits: ..."), so one paragraph is one
// topic. Splitting there keeps a chunk about one thing instead of cutting across topics.
export function chunkDocument(doc: Document): Chunk[] {
  return doc.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: `${doc.id}-chunk-${idx}`,
      docId: doc.id,
      docTitle: doc.title,
      source: doc.source,
      text,
    }));
}

// Build the full corpus of chunks from all documents
export function buildCorpus(): Chunk[] {
  return DOCUMENTS.flatMap((doc) => chunkDocument(doc));
}

// ─── TF-IDF scoring ──────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "a", "an", "is", "in", "on", "at", "to", "for", "of", "and", "or",
  "are", "be", "been", "was", "were", "with", "this", "that", "it", "as",
  "by", "from", "your", "you", "we", "our", "if", "not", "all", "can",
]);

function tokenize(text: string): Map<string, number> {
  const tokens = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (!STOPWORDS.has(t)) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

// Inverse document frequency for every term that appears in the corpus,
// using the standard smoothed log formulation: idf(t) = ln((N+1)/(df+1)) + 1.
function computeIdf(corpus: Chunk[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  for (const chunk of corpus) {
    for (const term of tokenize(chunk.text).keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }
  const N = corpus.length;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }
  return idf;
}

function tfidfVector(text: string, idf: Map<string, number>): Map<string, number> {
  const tf = tokenize(text);
  const out = new Map<string, number>();
  for (const [term, count] of tf) {
    // Out-of-vocabulary query terms get neutral weight (1.0).
    out.set(term, count * (idf.get(term) ?? 1));
  }
  return out;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [term, wA] of a) {
    magA += wA * wA;
    dot += wA * (b.get(term) ?? 0);
  }
  for (const [, wB] of b) magB += wB * wB;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// IDF is corpus-wide and expensive to recompute, so cache it per corpus instance.
let idfCache: { corpus: Chunk[]; idf: Map<string, number>; chunkVecs: Map<string, Map<string, number>> } | null = null;
function ensureIdf(corpus: Chunk[]) {
  if (idfCache && idfCache.corpus === corpus) return idfCache;
  const idf = computeIdf(corpus);
  const chunkVecs = new Map<string, Map<string, number>>();
  for (const c of corpus) chunkVecs.set(c.id, tfidfVector(c.text, idf));
  idfCache = { corpus, idf, chunkVecs };
  return idfCache;
}

export function retrieve(query: string, corpus: Chunk[], topK = 3): Chunk[] {
  const { idf, chunkVecs } = ensureIdf(corpus);
  const queryVec = tfidfVector(query, idf);
  const scored = corpus.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryVec, chunkVecs.get(chunk.id)!),
  }));
  return scored
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topK)
    .filter((c) => (c.score ?? 0) > 0);
}

// ─── Hybrid retrieval ────────────────────────────────────────────────────────

// Standard constant from the reciprocal rank fusion paper; it damps the gap between top ranks.
const RRF_K = 60;
// Below this cosine similarity a chunk is treated as unrelated, so a question the docs don't
// cover can still retrieve nothing instead of its least-bad match.
export const MIN_VECTOR_SIMILARITY = 0.3;

export type RetrievalMode = "hybrid" | "keyword";
export type RetrievalResult = { chunks: Chunk[]; mode: RetrievalMode };

function vectorCosine(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Merges ranked lists by position, so keyword and cosine scores never need a common scale.
// A chunk near the top of both lists beats one at the very top of only one.
export function reciprocalRankFusion(lists: Chunk[][]): Chunk[] {
  const fused = new Map<string, { chunk: Chunk; total: number }>();
  for (const list of lists) {
    list.forEach((chunk, rank) => {
      const entry = fused.get(chunk.id) ?? { chunk, total: 0 };
      entry.total += 1 / (RRF_K + rank + 1);
      fused.set(chunk.id, entry);
    });
  }
  const best = lists.length / (RRF_K + 1);
  return [...fused.values()]
    .sort((a, b) => b.total - a.total)
    .map(({ chunk, total }) => ({ ...chunk, score: total / best }));
}

// Corpus embeddings cost money and never change, so each corpus is embedded once per process.
const corpusVectors = new WeakMap<Chunk[], Promise<number[][]>>();
function embedCorpus(corpus: Chunk[], embed: Embedder) {
  let vectors = corpusVectors.get(corpus);
  if (!vectors) {
    vectors = embed(corpus.map((c) => `${c.docTitle}\n${c.text}`), "document");
    corpusVectors.set(corpus, vectors);
    vectors.catch(() => corpusVectors.delete(corpus));
  }
  return vectors;
}

// Falls back to keyword search when there is no embedder or the embedding call fails, so a
// missing key or a Voyage outage degrades results instead of breaking the page.
export async function retrieveHybrid(
  query: string,
  corpus: Chunk[],
  embed: Embedder | null,
  topK = 3
): Promise<RetrievalResult> {
  const keyword = retrieve(query, corpus, corpus.length);
  if (!embed) return { chunks: keyword.slice(0, topK), mode: "keyword" };

  try {
    const [vectors, [queryVector]] = await Promise.all([embedCorpus(corpus, embed), embed([query], "query")]);
    const semantic = corpus
      .map((chunk, i) => ({ ...chunk, score: vectorCosine(queryVector, vectors[i]) }))
      .filter((chunk) => chunk.score >= MIN_VECTOR_SIMILARITY)
      .sort((a, b) => b.score - a.score);
    return { chunks: reciprocalRankFusion([keyword, semantic]).slice(0, topK), mode: "hybrid" };
  } catch (err) {
    console.error("Falling back to keyword retrieval:", err instanceof Error ? err.message : String(err));
    return { chunks: keyword.slice(0, topK), mode: "keyword" };
  }
}

// ─── Generation ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You answer questions strictly from the documentation snippets provided by the user. Cite sources by their bracketed number (e.g. [1]). If the snippets do not contain the answer, say so plainly rather than guessing. Be concise.`;

export async function generateAnswer(query: string, chunks: Chunk[]): Promise<string> {
  if (chunks.length === 0) {
    return "I couldn't find relevant information in the knowledge base for your query. Try rephrasing or asking about API, onboarding, security, pricing, or troubleshooting.";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const context = chunks
    .map((c, i) => `[${i + 1}] From "${c.docTitle}" (${c.source}):\n${c.text}`)
    .join("\n\n---\n\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Question: ${query}\n\nRetrieved context:\n${context}` },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
