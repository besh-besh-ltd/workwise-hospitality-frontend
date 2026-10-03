// A failed chunk fetch (flaky network, a deploy that rotated chunk hashes)
// must not be cached: the next export click has to try again.

let attempts = 0;
jest.mock("xlsx-js-style", () => {
  attempts += 1;
  if (attempts === 1) throw new Error("ChunkLoadError");
  return { utils: { book_new: () => ({}) }, write: () => new ArrayBuffer(1) };
});

import { loadXlsx } from "./xlsx";

test("a failed load is retried on the next call, not cached", async () => {
  await expect(loadXlsx()).rejects.toThrow("ChunkLoadError");
  const XLSX = await loadXlsx();
  expect(typeof XLSX.utils.book_new).toBe("function");
  expect(attempts).toBe(2);
});
