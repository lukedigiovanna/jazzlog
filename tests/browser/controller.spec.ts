import { test, expect } from "@playwright/test";

test("connection refresh rejects results after an edit, revision change, or disposal", async ({
  page,
}) => {
  await page.route("**/src/services/library.ts", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export function getLibrary() { return new Promise(resolve => { window.completeRefresh = resolve; }); }",
    }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const connectionPath = "/src/app/libraryConnection.ts";
    const statePath = "/src/app/libraryState.ts";
    const servicePath = "/src/services/library.ts";
    const { LibraryConnection } = await import(
      /* @vite-ignore */ connectionPath
    );
    const { createLibraryState } = await import(/* @vite-ignore */ statePath);
    await import(/* @vite-ignore */ servicePath);
    const masthead = document.createElement("header");
    masthead.className = "masthead";
    document.body.append(masthead);
    const editor = document.createElement("dialog");
    document.body.append(editor);
    const empty = { albums: [], artists: [], genres: [], instruments: [] };
    const library = createLibraryState(structuredClone(empty));
    let renders = 0;
    const connection = new LibraryConnection({
      accountId: "refresh-guards",
      enabled: true,
      editor,
      library,
      resumeButton: () => document.createElement("button"),
      canBrowse: () => false,
      renderRoute: () => {
        renders++;
      },
    });
    const root = window as any;
    const start = async () => {
      root.completeRefresh = undefined;
      const pending = connection.refresh();
      while (!root.completeRefresh)
        await new Promise((resolve) => setTimeout(resolve, 0));
      return { pending };
    };

    const editing = await start();
    editor.showModal();
    root.completeRefresh(structuredClone(empty));
    const edited = await editing.pending;
    editor.close();

    const changing = await start();
    library.replace(structuredClone(empty), library.revision);
    const revision = library.revision;
    root.completeRefresh(structuredClone(empty));
    const changed = await changing.pending;

    const leaving = await start();
    connection.dispose();
    root.completeRefresh(structuredClone(empty));
    const disposed = await leaving.pending;
    return {
      edited,
      changed,
      disposed,
      renders,
      revisionUnchanged: library.revision === revision,
      banners: document.querySelectorAll(".connection-banner").length,
    };
  });
  expect(result).toEqual({
    edited: false,
    changed: false,
    disposed: false,
    renders: 0,
    revisionUnchanged: true,
    banners: 0,
  });
});

test("a save completing after disposal cannot alter the replacement editor", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/src/app/editorPersistence.ts";
    const { EditorPersistence } = await import(/* @vite-ignore */ path);
    const editor = document.createElement("dialog");
    const button = document.createElement("button");
    editor.append(button);
    document.body.append(editor);
    editor.showModal();
    let complete!: (value: { status: "saved" }) => void;
    let effects = 0;
    const persistence = new EditorPersistence({
      editor,
      library: {
        save: () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
        syncCatalogs: () => {},
      },
      cacheCommitted: () => {
        effects++;
      },
      clearDraft: () => {
        effects++;
      },
      renderRoute: () => {
        effects++;
      },
      announce: () => {
        effects++;
      },
    });
    const hash = location.hash;
    const pending = persistence.finishSave("saved-album", "Saved");
    const disabledDuringSave = button.disabled;
    persistence.dispose();
    editor.remove();

    const replacement = document.createElement("dialog");
    replacement.textContent = "Replacement edit";
    document.body.append(replacement);
    replacement.showModal();
    complete({ status: "saved" });
    await pending;
    return {
      disabledDuringSave,
      effects,
      sameHash: location.hash === hash,
      replacementOpen: replacement.open,
      replacementText: replacement.textContent,
    };
  });
  expect(result).toEqual({
    disabledDuringSave: true,
    effects: 0,
    sameHash: true,
    replacementOpen: true,
    replacementText: "Replacement edit",
  });
});
