type Layout = "grid" | "list";
type View = "library" | "artist";

const storageKey = (view: View) => `jazzlog:layout:${view}`;

export function readLayout(view: View): Layout {
  try {
    return localStorage.getItem(storageKey(view)) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export function saveLayout(view: View, layout: Layout): void {
  try {
    localStorage.setItem(storageKey(view), layout);
  } catch {
    // Layout changes still work for this session when storage is unavailable.
  }
}
