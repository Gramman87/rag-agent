import { NextRequest, NextResponse } from "next/server";
import { buildCorpus, retrieveHybrid, generateAnswer, chunkDocument } from "@/lib/rag";
import { embedderFromEnv } from "@/lib/embeddings";
import { DOCUMENTS } from "@/lib/documents";

const corpus = buildCorpus();
const MAX_QUERY_LENGTH = 500;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: `Query must be ${MAX_QUERY_LENGTH} characters or fewer` }, { status: 400 });
  }

  const { chunks, mode } = await retrieveHybrid(query, corpus, embedderFromEnv());

  // Retrieval works without Claude, so a generation problem still returns what was found.
  try {
    const answer = await generateAnswer(query, chunks);
    return NextResponse.json({ answer, chunks, mode, totalChunks: corpus.length });
  } catch (err: unknown) {
    console.error("RAG generation error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      answer: null,
      notice: "Answer generation is unavailable right now. These are the passages retrieval found.",
      chunks,
      mode,
      totalChunks: corpus.length,
    });
  }
}

export async function GET() {
  const docs = DOCUMENTS.map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source,
    chunks: chunkDocument(d).length,
    preview: d.content.slice(0, 120) + "...",
  }));
  return NextResponse.json({ docs, totalChunks: corpus.length, mode: embedderFromEnv() ? "hybrid" : "keyword" });
}
