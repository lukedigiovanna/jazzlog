/** Interaction hint, evaluated on demand as the primary input device changes.
 * Prefer CSS for layout; use this for optional keyboard-opening behavior.
 */
export function prefersTouchInteraction(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Skip optional typing shortcuts when touch is the primary input.
 * Explicit user focus, validation, and keyboard navigation stay native.
 */
export function focusForTyping(element: HTMLElement | null | undefined): void {
  if (!prefersTouchInteraction()) element?.focus({ preventScroll: true });
}
