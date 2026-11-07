import { renderHeader } from "../components/header";

export function renderApp(): string {
  return `
    <a class="skip-link" href="#main-content">Skip to content</a>
    ${renderHeader()}
    <main class="frame main" id="main-content" tabindex="-1"></main>
    <footer class="footer">
      <div class="frame footer-inner">
        <span>JazzLog <span aria-hidden="true">·</span> A personal listening journal</span>
        <span><span class="demo-dot" aria-hidden="true"></span>Demo library · Changes saved in this browser</span>
      </div>
    </footer>
    <dialog id="editor" aria-labelledby="dialog-title"></dialog>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>
  `;
}
