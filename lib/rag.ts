import { DOCUMENTS, Document } from "./documents";

export interface Chunk {
  id: string;
  docId: string;
  docTitle: string;
  source: string;
  text: string;
  score?: number;
}

// Split document content into overlapping chunks
export function chunkDocument(doc: Document, chunkSize = 300, overlap = 60): Chunk[] {
  const words = doc.content.split(/\s+/);
  const chunks: Chunk[] = [];
  let i = 0;
  let idx = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize);
    chunks.push({
      id: `${doc.id}-chunk-${idx}`,
      docId: doc.id,
      docTitle: doc.title,
      source: doc.source,
      text: slice.join(" "),
    });
    i += chunkSize - overlap;
    idx++;
  }

  return chunks;
}

// Build the full corpus of chunks from all documents
export function buildCorpus(): Chunk[] {
  return DOCUMENTS.flatMap((doc) => chunkDocument(doc));
}

// TF-IDF style scoring: tokenize and score overlap between query and chunk
function tokenize(text: string): Map<string, number> {
  const STOPWORDS = new Set([
    "the", "a", "an", "is", "in", "on", "at", "to", "for", "of", "and", "or",
    "are", "be", "been", "was", "were", "with", "this", "that", "it", "as",
    "by", "from", "your", "you", "we", "our", "if", "not", "all", "can",
  ]);
  const tokens = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (!STOPWORDS.has(t)) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [term, countA] of a) {
    magA += countA * countA;
    const countB = b.get(term) ?? 0;
    dot += countA * countB;
  }
  for (const [, countB] of b) {
    magB += countB * countB;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function retrieve(query: string, corpus: Chunk[], topK = 3): Chunk[] {
  const queryTokens = tokenize(query);
  const scored = corpus.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryTokens, tokenize(chunk.text)),
  }));
  return scored
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topK)
    .filter((c) => (c.score ?? 0) > 0);
}

// Mock answers keyed on topic — references retrieved context
const MOCK_RESPONSES: { pattern: RegExp; answer: (chunks: Chunk[]) => string }[] = [
  {
    pattern: /api|endpoint|token|rate.?limit|auth/i,
    answer: (chunks) =>
      `Based on the retrieved documentation, here's what I found:\n\n${chunks[0]?.text.slice(0, 200)}...\n\nKey takeaway: API access requires a Bearer token in the Authorization header. The default rate limit is 1,000 requests per minute, with headers (X-RateLimit-Remaining) included in every response. Enterprise plans support custom limits.`,
  },
  {
    pattern: /onboard|setup|start|provision|user|sso|import/i,
    answer: (chunks) =>
      `Based on the retrieved documentation, here's what I found:\n\n${chunks[0]?.text.slice(0, 200)}...\n\nKey takeaway: After contract signing, your CSM schedules a kickoff within 48 hours. Users can be provisioned manually, via SCIM (Okta, Azure AD, Google Workspace), or via CSV bulk import.`,
  },
  {
    pattern: /secur|encrypt|compliance|soc|gdpr|hipaa|breach|pen.?test/i,
    answer: (chunks) =>
      `Based on the retrieved documentation, here's what I found:\n\n${chunks[0]?.text.slice(0, 200)}...\n\nKey takeaway: All data is AES-256 encrypted at rest, TLS 1.2+ in transit. Acme is SOC 2 Type II certified, GDPR compliant, and HIPAA-eligible on Enterprise plans. Breach notification SLA is 72 hours.`,
  },
  {
    pattern: /price|pricing|plan|cost|discount|enterprise|startup/i,
    answer: (chunks) =>
      `Based on the retrieved documentation, here's what I found:\n\n${chunks[0]?.text.slice(0, 200)}...\n\nKey takeaway: Plans range from $49/mo (Starter, 5 users) to $199/mo (Growth, 25 users + API) to custom Enterprise pricing. Annual billing saves 20%. Nonprofits get 30% off; startups under $1M ARR qualify for 50% off Growth.`,
  },
  {
    pattern: /error|slow|webhook|sync|login|troubleshoot|issue|fail/i,
    answer: (chunks) =>
      `Based on the retrieved documentation, here's what I found:\n\n${chunks[0]?.text.slice(0, 200)}...\n\nKey takeaway: For 429 errors use exponential backoff. Webhooks disabled after 5 failures can be re-enabled under Settings > Webhooks. Data sync delays over 5 minutes typically indicate a revoked API token or firewall issue.`,
  },
];

export function generateAnswer(query: string, chunks: Chunk[]): string {
  if (chunks.length === 0) {
    return "I couldn't find relevant information in the knowledge base for your query. Try rephrasing or asking about API, onboarding, security, pricing, or troubleshooting.";
  }
  for (const { pattern, answer } of MOCK_RESPONSES) {
    if (pattern.test(query)) return answer(chunks);
  }
  return `Based on the retrieved documentation:\n\n${chunks[0]?.text.slice(0, 250)}...\n\nThe most relevant context was pulled from "${chunks[0]?.docTitle}" (${chunks[0]?.source}). ${chunks.length} chunk(s) were retrieved with similarity scores above threshold.`;
}
