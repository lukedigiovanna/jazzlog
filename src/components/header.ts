export function initializeMobileHeader(): void {
  const header = document.querySelector<HTMLElement>(".masthead");
  if (!header) return;

  const mobile = window.matchMedia("(max-width: 700px)");
  let lastY = window.scrollY;
  let travel = 0;

  function showHeader() {
    header!.classList.remove("masthead-hidden");
    travel = 0;
    lastY = window.scrollY;
  }

  window.addEventListener(
    "scroll",
    () => {
      // Clamp elastic overscroll so bouncing at either end cannot hide the nav.
      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const y = Math.min(maxY, Math.max(0, window.scrollY));
      const delta = y - lastY;
      lastY = y;

      if (
        !mobile.matches ||
        y <= header.offsetHeight ||
        header.contains(document.activeElement) ||
        document.querySelector("dialog[open]")
      ) {
        showHeader();
        return;
      }

      if (delta === 0) return;
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > 32) header.classList.add("masthead-hidden");
      if (travel < -10) header.classList.remove("masthead-hidden");
    },
    { passive: true },
  );
  header.addEventListener("focusin", showHeader);
  window.addEventListener("hashchange", showHeader);
  mobile.addEventListener("change", showHeader);
}

export function renderHeader(): string {
  return /* HTML */ `
    <header class="masthead">
      <div class="frame masthead-inner">
        <a class="brand" href="#" aria-label="JazzLog library"
          ><img src="./favicon.svg" alt="" width="38" height="38" /><span
            >JazzLog<span class="brand-period">.</span></span
          ></a
        >
        <nav class="main-nav" aria-label="Main navigation">
          <a href="#" data-nav="library">Library</a
          ><a href="#artists" data-nav="artists">Artists</a
          ><a href="#instruments" data-nav="instruments">Instruments</a
          ><a href="#genres" data-nav="genres">Genres</a>
        </nav>
        <button
          type="button"
          class="button primary top-add"
          data-action="add"
          id="top-add"
        >
          <span id="add-icon"></span>Add album
        </button>
      </div>
    </header>
  `;
}
