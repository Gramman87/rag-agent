import { NextRequest, NextResponse } from "next/server";
import { buildCorpus, retrieve, generateAnswer, chunkDocument } from "@/lib/rag";
import { DOCUMENTS } from "@/lib/documents";

const corpus = buildCorpus();

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "No query provided" }, { status: 400 });

  const chunks = retrieve(query, corpus, 3);
  const answer = generateAnswer(query, chunks);

  // Return chunks with scores for UI visualization
  return NextResponse.json({ answer, chunks, totalChunks: corpus.length });
}

export async function GET() {
  // Return corpus stats and document list for the UI
  const docs = DOCUMENTS.map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source,
    chunks: chunkDocument(d).length,
    preview: d.content.slice(0, 120) + "...",
  }));
  return NextResponse.json({ docs, totalChunks: corpus.length });
}
