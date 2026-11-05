import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { buildCorpus, reciprocalRankFusion, retrieveHybrid, type Chunk } from "../lib/rag";
import { voyageEmbedder, type Embedder } from "../lib/embeddings";

const chunk = (id: string): Chunk => ({ id, docId: "d", docTitle: "T", source: "S", text: id });

// Points the query at one chunk, so semantic search has a known right answer with no API call.
function fakeEmbedder(queryMatches: string, similarity = 1): Embedder {
  return async (texts, inputType) =>
    inputType === "query"
      ? texts.map(() => [similarity, 0, Math.sqrt(1 - similarity * similarity)])
      : texts.map((t) => (t.includes(queryMatches) ? [1, 0, 0] : [0, 1, 0]));
}

describe("reciprocal rank fusion", () => {
  it("prefers a chunk near the top of both lists over one at the top of only one", () => {
    const [a, b, c] = ["a", "b", "c"].map(chunk);
    const fused = reciprocalRankFusion([[a, b], [c, b]]);
    assert.equal(fused[0].id, "b");
  });

  it("scores a chunk ranked first in every list as 1", () => {
    const a = chunk("a");
    assert.equal(reciprocalRankFusion([[a], [a]])[0].score, 1);
  });
});

describe("hybrid retrieval", () => {
  const corpus = buildCorpus();
  const europe = "How do I keep my information inside Europe?";

  it("finds a paraphrase that keyword search misses, using the embeddings", async () => {
    const keywordOnly = await retrieveHybrid(europe, corpus, null, 10);
    assert.ok(!keywordOnly.chunks.some((c) => c.text.includes("eu-west-1")));

    const hybrid = await retrieveHybrid(europe, corpus, fakeEmbedder("eu-west-1"));
    assert.equal(hybrid.mode, "hybrid");
    assert.ok(hybrid.chunks.some((c) => c.text.includes("eu-west-1")));
  });

  it("ignores vector matches below the similarity floor", async () => {
    const off = await retrieveHybrid("xylophone zebra quartz", corpus, fakeEmbedder("eu-west-1", 0.1));
    assert.deepEqual(off.chunks, []);
  });

  it("uses keyword search when there is no embedder", async () => {
    const result = await retrieveHybrid("API rate limit", corpus, null);
    assert.equal(result.mode, "keyword");
    assert.match(result.chunks[0].text, /^Rate Limits:/);
  });

  it("falls back to keyword search when embedding fails, then retries next time", async () => {
    const fresh = buildCorpus();
    const silence = mock.method(console, "error", () => {});
    const failed = await retrieveHybrid("API rate limit", fresh, async () => {
      throw new Error("outage");
    });
    silence.mock.restore();
    assert.equal(failed.mode, "keyword");
    assert.match(failed.chunks[0].text, /^Rate Limits:/);

    assert.equal((await retrieveHybrid("API rate limit", fresh, fakeEmbedder("Rate Limits"))).mode, "hybrid");
  });

  it("embeds the corpus only once per process", async () => {
    const fresh = buildCorpus();
    let documentCalls = 0;
    const inner = fakeEmbedder("Rate Limits");
    const counting: Embedder = (texts, type) => {
      if (type === "document") documentCalls++;
      return inner(texts, type);
    };
    await retrieveHybrid("one", fresh, counting);
    await retrieveHybrid("two", fresh, counting);
    assert.equal(documentCalls, 1);
  });
});

describe("Voyage client", () => {
  afterEach(() => mock.restoreAll());

  it("sends the documented request and returns vectors in input order", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      Response.json({ data: [{ embedding: [2], index: 1 }, { embedding: [1], index: 0 }] })
    );
    const vectors = await voyageEmbedder("key-123")(["a", "b"], "document");
    assert.deepEqual(vectors, [[1], [2]]);

    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url, "https://api.voyageai.com/v1/embeddings");
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer key-123");
    assert.deepEqual(JSON.parse(init.body as string), { input: ["a", "b"], model: "voyage-4-lite", input_type: "document" });
  });

  it("reports the status without exposing the key", async () => {
    mock.method(globalThis, "fetch", async () => new Response("nope", { status: 401 }));
    await assert.rejects(voyageEmbedder("key-123")(["a"], "query"), (err: Error) => {
      assert.match(err.message, /401/);
      assert.ok(!err.message.includes("key-123"));
      return true;
    });
  });
});
