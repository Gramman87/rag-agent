import { buildCorpus, retrieve } from "../lib/rag";
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
for (const c of CASES) {
  const rank = retrieve(c.question, corpus, 10).findIndex((chunk) => chunk.text.includes(c.expect));
  if (rank !== 0) console.log(`  rank ${rank < 0 ? "miss" : rank + 1}: ${c.question}`);
}
