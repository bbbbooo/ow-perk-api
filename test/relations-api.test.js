import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";

async function withServer(callback) {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("관계 API 정상 조회, 필터, 400, 404를 처리한다", async () => {
  await withServer(async (baseUrl) => {
    const overview = await fetch(`${baseUrl}/api/relations/${encodeURIComponent("할머니")}`);
    assert.equal(overview.status, 200);
    assert.equal((await overview.json()).hero, "ana");

    const filtered = await fetch(`${baseUrl}/api/relations/dva?type=competition`);
    assert.equal(filtered.status, 200);
    assert.equal((await filtered.json()).competitions.length, 1);

    assert.equal((await fetch(`${baseUrl}/api/relations/ana?type=wrong`)).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/relations/not-a-hero`)).status, 404);
  });
});

test("후보 관계는 관리자 토큰 없이는 노출하지 않는다", async () => {
  const previous = process.env.RELATIONS_ADMIN_TOKEN;
  process.env.RELATIONS_ADMIN_TOKEN = "test-secret";
  try {
    await withServer(async (baseUrl) => {
      assert.equal((await fetch(`${baseUrl}/api/relations/ana?include_candidates=true`)).status, 403);
      const allowed = await fetch(`${baseUrl}/api/relations/ana?include_candidates=true`, {
        headers: { "x-relations-admin-token": "test-secret" },
      });
      assert.equal(allowed.status, 200);
    });
  } finally {
    if (previous === undefined) delete process.env.RELATIONS_ADMIN_TOKEN;
    else process.env.RELATIONS_ADMIN_TOKEN = previous;
  }
});
