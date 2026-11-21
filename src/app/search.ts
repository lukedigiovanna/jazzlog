function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matches(
  query: string,
  ...parts: (string | number | null)[]
): boolean {
  const haystack = normalize(parts.filter(Boolean).join(" "));
  return normalize(query.trim())
    .split(/\s+/)
    .every((token) => haystack.includes(token));
}

export function nameSimilarity(left: string, right: string): number {
  const words = (text: string) => normalize(text).split(/\s+/).sort();
  const leftWords = words(left);
  const rightWords = words(right);
  const leftName = leftWords.join(" ");
  const rightName = rightWords.join(" ");
  if (leftName === rightName) return 1;

  const pairs = (name: string) =>
    new Set(
      Array.from({ length: name.length - 1 }, (_, i) => name.slice(i, i + 2)),
    );
  const leftPairs = pairs(leftName);
  const rightPairs = pairs(rightName);
  const sharedPairs = [...leftPairs].filter((pair) =>
    rightPairs.has(pair),
  ).length;
  const sharedWords = leftWords.filter((word) =>
    rightWords.includes(word),
  ).length;
  const pairScore = (2 * sharedPairs) / (leftPairs.size + rightPairs.size || 1);
  const wordScore = (2 * sharedWords) / (leftWords.length + rightWords.length);

  return 0.7 * pairScore + 0.3 * wordScore;
}
