export function pinPostgresTlsMode(connectionString: string) {
  if (!URL.canParse(connectionString)) return connectionString;
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") return connectionString;

  const mode = url.searchParams.getAll("sslmode").at(-1);
  const libpqCompat = url.searchParams.getAll("uselibpqcompat").at(-1) === "true";
  // pg 8 treats these aliases as verify-full unless libpq compatibility is enabled.
  if (libpqCompat || (mode !== "prefer" && mode !== "require" && mode !== "verify-ca")) return connectionString;

  url.searchParams.set("sslmode", "verify-full");
  return url.href;
}
