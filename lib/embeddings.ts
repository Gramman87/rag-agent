export type InputType = "query" | "document";
export type Embedder = (texts: string[], inputType: InputType) => Promise<number[][]>;

const MODEL = "voyage-4-lite";
const TIMEOUT_MS = 8000;

export function voyageEmbedder(apiKey: string): Embedder {
  return async (texts, inputType) => {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Voyage embeddings failed with status ${res.status}`);
    const body: { data: { embedding: number[]; index: number }[] } = await res.json();
    return [...body.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  };
}

export function embedderFromEnv(): Embedder | null {
  const key = process.env.VOYAGE_API_KEY;
  return key ? voyageEmbedder(key) : null;
}
