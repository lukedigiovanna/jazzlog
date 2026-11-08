import { icon } from "../components/icons";
import { prefersTouchInteraction } from "./device";
import { createLifecycle } from "./lifecycle";
export function createDialog({
  editor,
  main,
  formState,
  onRendered,
  dismissDialog,
  updateArtists,
  updateGenres,
  onClose,
  routeHash,
}: {
  editor: HTMLDialogElement;
  main: HTMLElement;
  formState: () => string;
  onRendered: () => void;
  dismissDialog: () => void;
  updateArtists: () => void;
  updateGenres: () => void;
  onClose: () => void;
  routeHash: () => string;
}) {
  const lifecycle = createLifecycle(true);
  let origin: HTMLElement | undefined;
  const state = {
    baseline: "",
    pickerRenderPending: false,
    pickerPress: null as {
      button: HTMLButtonElement;
      pointerId: number;
      x: number;
      y: number;
      moved: boolean;
    } | null,
  };
  let suppressPickerClick = false;
  function showDialog(
    title: string,
    eyebrow: string,
    content: string,
    focusSelector: string,
    backToSearch = false,
  ) {
    const opening = !editor.open;
    if (opening) origin = document.activeElement as HTMLElement;
    editor.innerHTML = /* HTML */ `<div
        class="dialog-heading ${backToSearch ? "dialog-heading-with-back" : ""}"
      >
        <div>
          ${
            backToSearch
              ? /* HTML */ `<button
                  class="dialog-back"
                  type="button"
                  data-action="back-search"
                >
                  ${icon("back", 16)} Back to search
                </button>`
              : ""
          }
          <p class="eyebrow"><span></span> ${eyebrow}</p>
          <h2 id="dialog-title" tabindex="-1">${title}</h2>
        </div>
        <button
          class="icon-button close"
          type="button"
          aria-label="Close dialog"
          data-action="close"
        >
          ${icon("close", 22)}
        </button>
      </div>
      ${content}`;
    // Picker controls finish rendering synchronously after showDialog returns.
    lifecycle.queue(() => {
      state.baseline = formState();
      onRendered();
    });
    if (opening) editor.showModal();
    editor.scrollTop = 0;
    // Keep dialog focus accessible without opening a touch keyboard.
    editor
      .querySelector<HTMLElement>(
        prefersTouchInteraction() ? "#dialog-title" : focusSelector,
      )
      ?.focus({ preventScroll: true });
  }
  function isOutsideDialog(event: PointerEvent | MouseEvent) {
    const bounds = editor.getBoundingClientRect();
    return (
      editor.open &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    );
  }

  let pointerStartedOutside = false;
  let suppressBackdropClick = false;
  function updateSearchDropdowns(target: EventTarget | null) {
    for (const search of editor.querySelectorAll(".catalog-search")) {
      search.classList.toggle(
        "is-open",
        target instanceof Node && search.contains(target),
      );
    }
  }
  lifecycle.listen(editor).addEventListener("input", (event) => {
    updateSearchDropdowns(event.target);
  });
  lifecycle.listen(document).addEventListener("focusin", (event) => {
    if (!state.pickerPress) updateSearchDropdowns(event.target);
  });

  function finishPickerPress() {
    state.pickerPress = null;
    if (state.pickerRenderPending) {
      state.pickerRenderPending = false;
      updateArtists();
      updateGenres();
    }
  }

  lifecycle.listen(document).addEventListener("pointermove", (event) => {
    if (state.pickerPress?.pointerId !== event.pointerId) return;
    if (
      Math.hypot(
        event.clientX - state.pickerPress.x,
        event.clientY - state.pickerPress.y,
      ) > 8
    )
      state.pickerPress.moved = true;
  });
  lifecycle.listen(document).addEventListener(
    "pointerdown",
    (event) => {
      finishPickerPress();
      suppressPickerClick = false;
      const option = (event.target as Element).closest<HTMLButtonElement>(
        ".catalog-search .instrument-results button:not([disabled])",
      );
      if (
        option &&
        editor.contains(option) &&
        event.isPrimary &&
        event.button === 0
      ) {
        state.pickerPress = {
          button: option,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
        // Keep input focus and the software keyboard stable. Touch scrolling
        // remains native; pointercancel or movement prevents selection.
        event.preventDefault();
      }
      updateSearchDropdowns(event.target);
      suppressBackdropClick = false;
      pointerStartedOutside = isOutsideDialog(event);
    },
    true,
  );
  lifecycle.listen(document).addEventListener("pointercancel", () => {
    if (state.pickerPress) suppressPickerClick = true;
    finishPickerPress();
    pointerStartedOutside = false;
  });
  lifecycle.listen(document).addEventListener(
    "pointerup",
    (event) => {
      if (state.pickerPress?.pointerId === event.pointerId) {
        const press = state.pickerPress;
        state.pickerPress = null;
        suppressPickerClick = true;
        const releasedOn = document.elementFromPoint(
          event.clientX,
          event.clientY,
        );
        if (
          !press.moved &&
          press.button.isConnected &&
          releasedOn &&
          press.button.contains(releasedOn)
        ) {
          // Activate the original option once, before focus or keyboard changes
          // can retarget the browser's subsequent compatibility click.
          press.button.click();
        }
        finishPickerPress();
      }
      // Handle the release directly, before a synthesized click or focus change.
      // Dragging from a field to the backdrop must not dismiss the form.
      const dismiss = pointerStartedOutside && isOutsideDialog(event);
      pointerStartedOutside = false;
      if (dismiss) {
        suppressBackdropClick = true;
        event.preventDefault();
        event.stopPropagation();
        dismissDialog();
      }
    },
    true,
  );
  lifecycle.listen(document).addEventListener(
    "click",
    (event) => {
      if (suppressPickerClick && event.detail > 0) {
        suppressPickerClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (!suppressBackdropClick) return;
      suppressBackdropClick = false;
      // iOS can send a click to the control exposed by closing the dialog.
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  lifecycle.listen(editor).addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissDialog();
  });

  // Keep Tab at the dialog boundaries rather than moving into browser chrome.
  lifecycle.listen(editor).addEventListener("keydown", (event) => {
    const search = (event.target as HTMLElement).closest(".catalog-search");
    if (search) {
      const input = search.querySelector<HTMLInputElement>("input")!;
      const options = [
        ...search.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
      ];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const index = options.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "ArrowDown"
            ? index + 1
            : index < 0
              ? options.length - 1
              : index - 1;
        (options[next] ?? input).focus();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        updateSearchDropdowns(null);
        editor
          .querySelector<HTMLElement>("#dialog-title")
          ?.focus({ preventScroll: true });
        return;
      }
    }
    if (
      event.key === "Enter" &&
      ["instrument-query", "artist-query", "genre-query"].includes(
        (event.target as HTMLElement).id,
      )
    ) {
      event.preventDefault();
      editor
        .querySelector<HTMLButtonElement>(
          (event.target as HTMLElement).id === "artist-query"
            ? "#artist-results button"
            : (event.target as HTMLElement).id === "genre-query"
              ? "#genre-results button:not([disabled])"
              : "#instrument-create:not([hidden]) button, #instrument-results button",
        )
        ?.click();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...editor.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary",
      ),
    ].filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  lifecycle.listen(editor).addEventListener("close", () => {
    onClose();
    if (
      origin?.isConnected &&
      location.hash === routeHash() &&
      !main.contains(document.activeElement)
    )
      origin.focus();
    origin = undefined;
  });

  return {
    get baseline() {
      return state.baseline;
    },
    set baseline(value: string) {
      state.baseline = value;
    },
    get pickerPress() {
      return state.pickerPress;
    },
    get pickerRenderPending() {
      return state.pickerRenderPending;
    },
    set pickerRenderPending(value: boolean) {
      state.pickerRenderPending = value;
    },
    mount: () => lifecycle.mount(),
    showDialog,
    updateSearchDropdowns,
    dispose() {
      lifecycle.dispose();
      origin = undefined;
      state.pickerPress = null;
    },
  };
}
