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
          ><a href="#instruments" data-nav="instruments">Instruments</a>
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
