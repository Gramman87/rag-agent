"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Database, Zap, ChevronRight, Loader2 } from "lucide-react";

interface Chunk {
  id: string;
  docTitle: string;
  source: string;
  text: string;
  score: number;
}

interface Doc {
  id: string;
  title: string;
  source: string;
  chunks: number;
  preview: string;
}

const SUGGESTIONS = [
  "How do I set up SSO?",
  "What are the API rate limits?",
  "Is the platform HIPAA compliant?",
  "How much does the Enterprise plan cost?",
  "Why is my webhook failing?",
];

type Stage = "idle" | "working" | "done";

export default function RAGPage() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [answer, setAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"hybrid" | "keyword">("keyword");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    fetch("/api/rag").then((r) => r.json()).then((d) => {
      setDocs(d.docs);
      setTotalChunks(d.totalChunks);
      setMode(d.mode);
    });
  }, []);

  // Typewriter effect for answer
  useEffect(() => {
    if (!answer) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedAnswer(answer.slice(0, i));
      i += 3;
      if (i > answer.length) {
        setDisplayedAnswer(answer);
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [answer]);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setStage("working");
    setChunks([]);
    setAnswer("");
    setDisplayedAnswer("");
    setNotice("");

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setChunks(data.chunks);
      setAnswer(data.answer ?? "");
      setNotice(data.notice ?? "");
      setMode(data.mode);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Request failed");
    }
    setStage("done");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">RAG Knowledge Agent</h1>
              <p className="text-xs text-gray-500">Retrieval-Augmented Generation · {totalChunks} chunks indexed</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Corpus loaded
            </span>
            <span className="hidden md:block">{docs.length} documents · {mode === "hybrid" ? "hybrid retrieval (vector + TF-IDF)" : "keyword retrieval (TF-IDF)"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: Corpus */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Knowledge Base</h2>
            {docs.map((doc) => (
              <div key={doc.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.source} · {doc.chunks} chunks</p>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{doc.preview}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Query + Pipeline */}
          <div className="lg:col-span-2 space-y-5">

            {/* Query input */}
            <div>
              <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Query</h2>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask something about the knowledge base..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                />
                <button
                  type="submit"
                  disabled={stage === "working"}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 text-white px-4 py-3 rounded-xl transition-colors"
                >
                  {stage === "working"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Search className="w-4 h-4" />
                  }
                </button>
              </form>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); run(s); }}
                    className="text-xs text-gray-500 hover:text-cyan-400 border border-white/[0.06] hover:border-cyan-500/30 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline stages */}
            {stage !== "idle" && (
              <div className="animate-fade-in">
                <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">Pipeline</h2>
                <div className="flex items-center gap-2 mb-5">
                  {[
                    { label: mode === "hybrid" ? "Hybrid Retrieval" : "Keyword Retrieval", done: stage === "done" },
                    { label: "Generate with Claude", done: stage === "done" && answer !== "" },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2">
                      {i > 0 && <ChevronRight className="w-3 h-3 text-gray-700" />}
                      <span className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        step.done
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "bg-white/[0.03] border-white/[0.06] text-gray-600"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Retrieved chunks */}
                {chunks.length > 0 && (
                  <div className="space-y-3 mb-5">
                    <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                      Retrieved Context ({chunks.length} chunks)
                    </h3>
                    {chunks.map((chunk, i) => (
                      <div key={chunk.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-cyan-400">#{i + 1}</span>
                            <span className="text-xs text-gray-400 font-medium">{chunk.docTitle}</span>
                            <span className="text-xs text-gray-600">· {chunk.source}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.round(chunk.score * 100))}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{Math.round(chunk.score * 100)}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{chunk.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer */}
                {notice && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-5">{notice}</p>
                )}

                {answer && (
                  <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Answer</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {displayedAnswer}
                      {displayedAnswer.length < answer.length && <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />}
                    </p>
                  </div>
                )}
              </div>
            )}

            {stage === "idle" && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Database className="w-10 h-10 text-gray-800 mb-4" />
                <p className="text-sm text-gray-600">Ask a question to see the RAG pipeline in action</p>
                <p className="text-xs text-gray-700 mt-1">Retrieval scores each chunk, then Claude answers from the top matches with citations</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
