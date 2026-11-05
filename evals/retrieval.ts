import { buildCorpus, retrieve, retrieveHybrid } from "../lib/rag";
import { embedderFromEnv } from "../lib/embeddings";
import { CASES } from "./cases";
import { score, type Score } from "./scoring";

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
const row = (label: string, s: Score) =>
  `${label.padEnd(24)} n=${String(s.cases).padEnd(3)} hit@1 ${pct(s.hitAt1)}   hit@3 ${pct(s.hitAt3)}   MRR ${s.mrr.toFixed(2)}`;

const corpus = buildCorpus();
console.log(`Corpus: ${corpus.length} chunks\n`);

for (const kind of ["direct", "paraphrase"] as const) {
  const cases = CASES.filter((c) => c.kind === kind);
  console.log(row(`keyword / ${kind}`, score(cases, cases.map((c) => retrieve(c.question, corpus, 10)))));
}

async function main() {
  const embed = embedderFromEnv();
  if (!embed) {
    console.log("\nSet VOYAGE_API_KEY to score hybrid retrieval as well.");
  } else {
    for (const kind of ["direct", "paraphrase"] as const) {
      const cases = CASES.filter((c) => c.kind === kind);
      const results = [];
      for (const c of cases) {
        const { chunks, mode } = await retrieveHybrid(c.question, corpus, embed, 10);
        if (mode !== "hybrid") throw new Error("Embedding failed, so this would not be a hybrid score");
        results.push(chunks);
      }
      console.log(row(`hybrid / ${kind}`, score(cases, results)));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
