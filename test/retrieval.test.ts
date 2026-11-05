import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCorpus, chunkDocument, retrieve } from "../lib/rag";
import { DOCUMENTS } from "../lib/documents";
import { CASES } from "../evals/cases";

const corpus = buildCorpus();

describe("chunking", () => {
  it("splits documents into one chunk per paragraph, with unique IDs", () => {
    assert.ok(corpus.length > DOCUMENTS.length * 3, `only ${corpus.length} chunks`);
    assert.equal(new Set(corpus.map((c) => c.id)).size, corpus.length);
    const rateLimits = chunkDocument(DOCUMENTS[1]).find((c) => c.text.startsWith("Rate Limits:"));
    assert.ok(rateLimits, "expected a Rate Limits chunk");
    assert.ok(!rateLimits.text.includes("Authentication:"), "chunk crossed a topic boundary");
  });
});

describe("keyword retrieval", () => {
  it("ranks the paragraph about rate limits first", () => {
    assert.match(retrieve("What is the API rate limit?", corpus)[0].text, /^Rate Limits:/);
  });

  it("returns nothing when no term matches", () => {
    assert.deepEqual(retrieve("xylophone zebra quartz", corpus), []);
  });

  it("returns at most topK chunks, best first", () => {
    const results = retrieve("Enterprise plan API", corpus, 2);
    assert.equal(results.length, 2);
    assert.ok(results[0].score! >= results[1].score!);
  });
});

describe("eval cases", () => {
  it("each expected phrase exists in exactly one chunk", () => {
    for (const c of CASES) {
      const matches = corpus.filter((chunk) => chunk.text.includes(c.expect));
      assert.equal(matches.length, 1, `"${c.expect}" matched ${matches.length} chunks`);
    }
  });
});
