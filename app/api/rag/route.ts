import { NextRequest, NextResponse } from "next/server";
import { buildCorpus, retrieve, generateAnswer, chunkDocument } from "@/lib/rag";
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

  const chunks = retrieve(query, corpus, 3);

  // Retrieval works without Claude, so a generation problem still returns what was found.
  try {
    const answer = await generateAnswer(query, chunks);
    return NextResponse.json({ answer, chunks, totalChunks: corpus.length });
  } catch (err: unknown) {
    console.error("RAG generation error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      answer: null,
      notice: "Answer generation is unavailable right now. These are the passages retrieval found.",
      chunks,
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
  return NextResponse.json({ docs, totalChunks: corpus.length });
}
