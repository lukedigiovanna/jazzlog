import type { Album } from "../types/albums";
import {
  buildDiscoveryPrompt,
  type DiscoveryDirection,
} from "./discoveryPrompt";

export function createDiscovery({
  editor,
  albums,
  showDialog,
  announce,
}: {
  editor: HTMLDialogElement;
  albums: () => Album[];
  showDialog: (title: string, content: string, focus: string) => void;
  announce: (message: string) => void;
}) {
  const directions: { value: DiscoveryDirection; label: string }[] = [
    { value: "close", label: "Stay close" },
    { value: "branch", label: "Branch out" },
    { value: "surprise", label: "Surprise" },
  ];
  let prompt = "";
  function update() {
    if (!editor.querySelector("#discovery-panel")) return;
    const slider = editor.querySelector<HTMLInputElement>(
      "#discovery-direction",
    )!;
    const direction = directions[Number(slider.value)]!;
    slider.setAttribute("aria-valuetext", direction.label);
    editor
      .querySelectorAll<HTMLElement>(".discovery-direction-labels span")
      .forEach((label, index) => {
        label.dataset.selected = String(index === Number(slider.value));
      });
    const result = buildDiscoveryPrompt(albums(), {
      topic:
        editor.querySelector<HTMLTextAreaElement>("#discovery-request")!.value,
      direction: direction.value,
    });
    prompt = result.prompt;
    editor.querySelector<HTMLTextAreaElement>("#discovery-preview")!.value =
      prompt;
    editor.querySelector("#discovery-summary")!.textContent =
      `Using ${result.contextCount} albums for taste context`;
  }
  function manualCopy() {
    if (!editor.querySelector("#discovery-panel")) return;
    editor.querySelector<HTMLDetailsElement>("#discovery-details")!.open = true;
    const preview =
      editor.querySelector<HTMLTextAreaElement>("#discovery-preview")!;
    preview.focus();
    preview.select();
    editor.querySelector("#discovery-status")!.textContent =
      "Automatic copy is unavailable. Select the prompt and copy it manually, then open ChatGPT.";
  }
  function copy(open: boolean) {
    // Start both clipboard access and navigation during the user gesture.
    let copying: Promise<void>;
    try {
      if (!navigator.clipboard?.writeText) {
        manualCopy();
        return;
      }
      copying = navigator.clipboard.writeText(prompt);
    } catch {
      manualCopy();
      return;
    }
    if (open) {
      // The native fragment is registered by ChatGPT for app handoff.
      // Avoid a new browsing context on phones so the OS can handle the link.
      window.open(
        "https://chatgpt.com/#native",
        window.matchMedia("(pointer: coarse)").matches ? "_self" : "_blank",
        "noopener,noreferrer",
      );
    }
    void copying.then(() => {
      announce("Prompt copied. Paste it into ChatGPT.");
    }, manualCopy);
  }
  return {
    update,
    click(button: HTMLButtonElement) {
      if (button.dataset.action === "discover") {
        showDialog(
          "Discover your next album",
          /* HTML */ `<div class="dialog-body discovery" id="discovery-panel">
            <fieldset>
              <legend id="discovery-direction-title">How adventurous?</legend>
              <div class="discovery-directions">
                <input
                  id="discovery-direction"
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value="0"
                  aria-labelledby="discovery-direction-title"
                  aria-valuetext="Stay close"
                />
                <div class="discovery-direction-labels" aria-hidden="true">
                  ${directions.map(({ label }) => /* HTML */ `<span>${label}</span>`).join("")}
                </div>
              </div>
            </fieldset>
            <label class="field"
              ><span
                >What are you in the mood for? <small>(optional)</small></span
              ><textarea
                id="discovery-request"
                rows="3"
                maxlength="500"
                placeholder="Japanese jazz with electric piano, something mellow…"
              ></textarea>
            </label>
            <p
              id="discovery-summary"
              class="dialog-intro"
              aria-live="polite"
            ></p>
            <details id="discovery-details">
              <summary>Preview prompt</summary>
              <label class="field"
                ><span>Generated prompt</span
                ><textarea id="discovery-preview" rows="9" readonly></textarea>
              </label>
            </details>
            <p id="discovery-status" role="status"></p>
            <div class="discovery-actions">
              <button
                class="button primary"
                data-action="discovery-open"
                type="button"
              >
                Copy prompt &amp; open ChatGPT</button
              ><button
                class="button secondary"
                data-action="discovery-copy"
                type="button"
              >
                Copy prompt</button
              ><a
                class="button secondary"
                href="https://chatgpt.com/#native"
                rel="noopener noreferrer"
                >Open ChatGPT <span aria-hidden="true">↗</span></a
              >
            </div>
          </div>`,
          "#dialog-title",
        );
        update();
        return true;
      }
      if (
        button.dataset.action === "discovery-open" ||
        button.dataset.action === "discovery-copy"
      ) {
        copy(button.dataset.action === "discovery-open");
        return true;
      }
      return false;
    },
  };
}
