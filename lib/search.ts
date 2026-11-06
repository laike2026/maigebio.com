export type SearchParams = Record<string, string | string[] | undefined>;

export function searchValue(params: SearchParams, key: string, limit = 150) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, limit) ?? "";
}

function searchable(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[‐‑–—-]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchesSearch(query: string, ...fields: string[]) {
  const phrase = searchable(query);
  const content = searchable(fields.join(" "));
  return !phrase || phrase.split(" ").every((word) => content.includes(word));
}

export function searchPattern(value?: string) {
  const query = value?.trim().slice(0, 150);
  return query ? `%${query.replace(/[\\%_]/g, "\\$&")}%` : "";
}
