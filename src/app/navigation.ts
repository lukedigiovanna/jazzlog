import { createLifecycle } from "./lifecycle";
/** Keep the moving highlight and touch navigation in the same order as the links. */
export function initializeNavigation(
  renderPage: (hash: string) => HTMLElement,
): () => void {
  const lifecycle = createLifecycle();
  const nav = document.querySelector<HTMLElement>(".main-nav")!;
  const main = document.querySelector<HTMLElement>("main")!;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("[data-nav]")];
  const highlight = document.createElement("span");
  highlight.className = "nav-highlight";
  highlight.setAttribute("aria-hidden", "true");
  nav.prepend(highlight);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 700px)");
  let animation: Animation | undefined;
  let initialized = false;
  let active: HTMLAnchorElement | undefined;

  function updateHighlight(animate = true) {
    const next = links.find((link) => link.hasAttribute("aria-current"));
    if (!next) return;
    const previous = highlight.getBoundingClientRect();
    const bounds = next.getBoundingClientRect();
    animation?.cancel();
    highlight.style.left = `${next.offsetLeft}px`;
    highlight.style.top = `${next.offsetTop}px`;
    highlight.style.width = `${bounds.width}px`;
    highlight.style.height = `${bounds.height}px`;
    if (initialized && animate && active !== next && !reducedMotion.matches) {
      const dx = previous.left - bounds.left;
      const scale = previous.width / bounds.width;
      animation = highlight.animate(
        [
          { transform: `translateX(${dx}px) scale(${scale}, 1)` },
          {
            transform: `translateX(${dx * 0.45}px) scale(1.18, 0.84)`,
            offset: 0.3,
          },
          {
            transform: `translateX(${-dx * 0.055}px) scale(0.94, 1.09)`,
            offset: 0.65,
          },
          {
            transform: `translateX(${dx * 0.018}px) scale(1.025, 0.98)`,
            offset: 0.83,
          },
          { transform: "translateX(0) scale(1)" },
        ],
        { duration: 280, easing: "ease-in-out" },
      );
    }
    active = next;
    initialized = true;
  }

  const mutation = new MutationObserver(() => updateHighlight());
  mutation.observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current"],
  });
  const resize = new ResizeObserver(() => updateHighlight(false));
  resize.observe(nav);
  document.fonts.ready.then(() => {
    if (lifecycle.active) updateHighlight(false);
  });
  lifecycle
    .listen(reducedMotion)
    .addEventListener("change", () => updateHighlight(false));
  updateHighlight(false);

  type Gesture = {
    x: number;
    y: number;
    dx: number;
    horizontal: boolean;
    index: number;
    width: number;
  };
  let gesture: Gesture | undefined;
  let previews: HTMLElement[] = [];
  let settling = false;
  let settlement = 0;
  const pageIndex = () =>
    links.findIndex((link) => link.hash === location.hash);

  function cleanup() {
    clearTimeout(settlement);
    previews.forEach((page) => page.remove());
    previews = [];
    main.style.transform = "";
    main.style.transition = "";
    document.body.classList.remove("swiping-pages");
    gesture = undefined;
    settling = false;
  }

  function prepare(start: Gesture) {
    document.body.classList.add("swiping-pages");
    const bounds = main.getBoundingClientRect();
    for (const direction of [-1, 1]) {
      const link = links[start.index + direction];
      if (!link) continue;
      const page = renderPage(link.hash);
      page.style.top = `${Math.max(0, bounds.top)}px`;
      page.style.left = `${bounds.left}px`;
      page.style.width = `${bounds.width}px`;
      page.dataset.direction = String(direction);
      document.body.append(page);
      previews.push(page);
    }
  }

  function move(start: Gesture, dx: number) {
    main.style.transform = `translate3d(${dx}px, 0, 0)`;
    previews.forEach((page) => {
      const direction = Number(page.dataset.direction);
      page.style.transform = `translate3d(${direction * start.width + dx}px, 0, 0)`;
    });
  }

  function finish(commit = false) {
    const start = gesture;
    if (!start?.horizontal) {
      cleanup();
      return;
    }
    settling = true;
    const direction = start.dx < 0 ? 1 : -1;
    const link = links[start.index + direction];
    const target = commit && link ? -direction * start.width : 0;
    const duration = reducedMotion.matches ? 0 : 220;
    for (const page of [main, ...previews]) {
      page.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
    }
    move(start, target);
    settlement = window.setTimeout(() => {
      cleanup();
      if (commit && link) link.click();
    }, duration);
  }

  lifecycle.listen(main).addEventListener(
    "touchstart",
    (event) => {
      if (settling) return;
      cleanup();
      if (
        !mobile.matches ||
        event.touches.length !== 1 ||
        pageIndex() < 0 ||
        document.querySelector("dialog[open]") ||
        (event.target as Element).closest(
          "input, textarea, select, [contenteditable], audio, video",
        )
      )
        return;
      const touch = event.touches[0];
      if (touch.clientX < 18 || touch.clientX > window.innerWidth - 18) return;
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        dx: 0,
        horizontal: false,
        index: pageIndex(),
        width: window.innerWidth,
      };
    },
    { passive: true },
  );

  lifecycle.listen(main).addEventListener(
    "touchmove",
    (event) => {
      const start = gesture;
      if (!start || settling) return;
      if (event.touches.length !== 1) {
        finish();
        return;
      }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (!start.horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
          cleanup();
          return;
        }
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        if (!event.cancelable || window.getSelection()?.toString()) {
          cleanup();
          return;
        }
        start.horizontal = true;
        prepare(start);
      }
      if (event.cancelable) event.preventDefault();
      const hasNeighbor = links[start.index + (dx < 0 ? 1 : -1)];
      start.dx = hasNeighbor
        ? Math.max(-start.width, Math.min(start.width, dx))
        : dx * 0.2;
      move(start, start.dx);
    },
    { passive: false },
  );

  lifecycle.listen(main).addEventListener(
    "touchend",
    () => {
      if (settling) return;
      const start = gesture;
      finish(Boolean(start && Math.abs(start.dx) >= start.width * 0.23));
    },
    { passive: true },
  );
  lifecycle.listen(main).addEventListener(
    "touchcancel",
    () => {
      if (!settling) finish();
    },
    { passive: true },
  );
  // A drag starting on an album link must not open it after the swipe.
  lifecycle.listen(main).addEventListener(
    "click",
    (event) => {
      if (gesture?.horizontal || settling) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  lifecycle.listen(window).addEventListener("hashchange", cleanup);
  lifecycle.listen(window).addEventListener("resize", cleanup);
  return () => {
    lifecycle.dispose();
    mutation.disconnect();
    resize.disconnect();
    animation?.cancel();
    cleanup();
    highlight.remove();
  };
}
