import { makeId } from "./id";

// Browser entries are the source of truth, so Back and Forward also move the
// in-app return stack rather than recording another visit.
export function createRouteHistory(accountId: string) {
  const key = "jazzlogRoute";
  const storageKey = `jazzlog:route-history:${accountId}`;
  let session = makeId();
  const entries: { hash: string; scroll: number }[] = [];
  let cursor = -1;

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    const marker = history.state?.[key];
    if (
      typeof saved?.session === "string" &&
      saved.session === marker?.session &&
      Number.isInteger(marker.index) &&
      Array.isArray(saved.entries) &&
      saved.entries.every(
        (entry: { hash?: unknown; scroll?: unknown } | null) =>
          entry !== null &&
          typeof entry.hash === "string" &&
          typeof entry.scroll === "number" &&
          Number.isFinite(entry.scroll) &&
          entry.scroll >= 0,
      ) &&
      saved.entries[marker.index]?.hash === location.hash
    ) {
      session = saved.session;
      entries.push(...saved.entries);
    }
  } catch {
    // Navigation still works in memory when storage is unavailable or invalid.
  }

  function persist() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ session, entries }));
    } catch {
      // Storage failures must not interrupt navigation.
    }
  }

  function arrive() {
    const marker = history.state?.[key];
    if (
      marker?.session === session &&
      entries[marker.index]?.hash === location.hash
    ) {
      cursor = marker.index;
      return entries[cursor].scroll;
    }
    entries.splice(cursor + 1);
    cursor = entries.push({ hash: location.hash, scroll: 0 }) - 1;
    history.replaceState(
      { ...history.state, [key]: { session, index: cursor } },
      "",
    );
    persist();
    return 0;
  }

  arrive();
  return {
    arrive,
    replace: () => {
      entries[cursor] = { hash: location.hash, scroll: 0 };
      persist();
    },
    previous: () => entries[cursor - 1]?.hash,
    saveScroll: () => {
      if (entries[cursor].scroll === window.scrollY) return;
      entries[cursor].scroll = window.scrollY;
      persist();
    },
  };
}
