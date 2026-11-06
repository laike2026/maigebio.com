import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "pg";
import { pinPostgresTlsMode } from "../lib/postgres-url.ts";

const database = "postgresql://qa:p%40ss%26word@database.example:5433/maige";

test("postgres defaults keep full TLS verification and connection parameters", () => {
  for (const alias of ["prefer", "require", "verify-ca"]) {
    const url = pinPostgresTlsMode(`${database}?sslmode=${alias}&channel_binding=require&application_name=MAIGE%20QA`);
    const client = new Client({ connectionString: url });
    assert.equal(new URL(url).searchParams.get("sslmode"), "verify-full");
    assert.equal(new URL(url).searchParams.get("channel_binding"), "require");
    assert.equal(client.password, "p@ss&word");
    assert.equal(client.connectionParameters.port, 5433);
    assert.equal(client.connectionParameters.application_name, "MAIGE QA");
    assert.deepEqual(client.ssl, {});
  }
});

test("postgres keeps explicit libpq compatibility and unrelated connection strings", () => {
  for (const url of [
    `${database}?sslmode=require&uselibpqcompat=true`,
    `${database}?sslmode=require&sslmode=disable`,
    `${database}?sslmode=verify-full`,
    database,
    "/var/run/postgresql maige",
  ]) assert.equal(pinPostgresTlsMode(url), url);
  assert.equal(new URL(pinPostgresTlsMode(`${database}?sslmode=disable&sslmode=require`)).search, "?sslmode=verify-full");
});
