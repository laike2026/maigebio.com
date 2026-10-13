import test from "node:test";
import assert from "node:assert/strict";
import { copies } from "../lib/i18n.ts";

test("all four locales have complete, nonempty public strings", () => {
  const keys = Object.keys(copies.en);
  for (const locale of ["ar", "ru", "es"]) {
    assert.deepEqual(Object.keys(copies[locale]).sort(), keys.slice().sort(), `${locale} keys differ from English`);
    for (const key of keys) assert.ok(copies[locale][key].trim(), `${locale}.${key} is empty`);
  }
});
