import test from "node:test";
import assert from "node:assert/strict";
import { searchValue, matchesSearch, searchPattern } from "../lib/search.ts";
import { requestOriginMatches } from "../lib/request-origin.ts";

test("catalog input uses the first value and treats SQL wildcard characters literally", () => {
  assert.equal(searchValue({ q: [" ELISA ", "filter"] }, "q"), "ELISA");
  assert.equal(searchValue({ q: "abcd" }, "q", 3), "abc");
  assert.equal(matchesSearch("Biología molecular", "biologia-molecular"), true);
  assert.equal(matchesSearch("plate ELISA", "ELISA 96-well plate"), true);
  assert.equal(matchesSearch("unavailable target", "ELISA plate"), false);
  assert.equal(searchPattern("20%_"), "%20\\%\\_%");
});

test("same-host origins are recognized and invalid origins fail closed", () => {
  const url = "https://maigebio.example/en";
  assert.equal(requestOriginMatches(new Request(url, { headers: { Origin: "https://maigebio.example" } })), true);
  for (const origin of ["null", "broken", "https://unrelated.example", "https://maigebio.example/inquiry"]) {
    assert.equal(requestOriginMatches(new Request(url, { headers: { Origin: origin } })), false);
  }
});
