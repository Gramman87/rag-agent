import type { Chunk } from "../lib/rag";
import type { EvalCase } from "./cases";

export type Score = { cases: number; hitAt1: number; hitAt3: number; mrr: number };

export function score(cases: EvalCase[], results: Chunk[][]): Score {
  let hitAt1 = 0;
  let hitAt3 = 0;
  let reciprocal = 0;
  cases.forEach((c, i) => {
    const rank = results[i].findIndex((chunk) => chunk.text.includes(c.expect));
    if (rank === 0) hitAt1++;
    if (rank >= 0 && rank < 3) hitAt3++;
    if (rank >= 0) reciprocal += 1 / (rank + 1);
  });
  const n = cases.length;
  return { cases: n, hitAt1: hitAt1 / n, hitAt3: hitAt3 / n, mrr: reciprocal / n };
}
