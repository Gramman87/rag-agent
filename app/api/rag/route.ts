import { NextRequest, NextResponse } from "next/server";
import { buildCorpus, retrieve, generateAnswer, chunkDocument } from "@/lib/rag";
import { DOCUMENTS } from "@/lib/documents";

const corpus = buildCorpus();

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  const chunks = retrieve(query, corpus, 3);

  try {
    const answer = await generateAnswer(query, chunks);
    return NextResponse.json({ answer, chunks, totalChunks: corpus.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("RAG generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
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
