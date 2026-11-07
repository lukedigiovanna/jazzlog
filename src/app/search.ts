function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function matches(query: string, ...parts: (string | number | null)[]) {
  const haystack = normalize(parts.filter(Boolean).join(' '));
  return normalize(query.trim()).split(/\s+/).every((token) => haystack.includes(token));
}
