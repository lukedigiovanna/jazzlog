import "./styles/main.css";
import { renderApp } from "./app/app";
import { initializeNavigation } from "./app/navigation";
import { initializeApp, type LibraryData } from "./app/controller";
import { initializeMobileHeader } from "./components/header";
import { renderAuthView, initializeAuthView } from "./views/authView";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error('Missing "#app" root element.');

let libraryMounted = false;
let accountId: string | null = null;
let signingOut = false;
let stopAuth: (() => void) | undefined;

function enterLibrary(authenticated = false, data?: LibraryData): void {
  if (libraryMounted) {
    // The library owns document listeners. Reload rather than registering them twice
    // when switching between demo/account mode or between different accounts.
    if (authenticated) window.location.reload();
    return;
  }
  libraryMounted = true;
  root!.innerHTML = renderApp(authenticated);
  const renderNavigationPage = initializeApp(data);
  initializeMobileHeader();
  initializeNavigation(renderNavigationPage);
  const account = document.createElement("button");
  account.type = "button";
  account.className = "auth-text-button account-button";
  account.textContent = authenticated ? "Sign out" : "Sign in";
  document.querySelector(".masthead-inner")!.append(account);
  account.addEventListener("click", async () => {
    account.disabled = true;
    try {
      if (authenticated) {
        signingOut = true;
        const { signOut } = await import("./services/auth");
        await signOut();
      }
      window.location.reload();
    } catch {
      signingOut = false;
      account.disabled = false;
      const toast = document.querySelector<HTMLElement>("#toast")!;
      toast.textContent = "Couldn’t sign out. Please try again.";
      toast.classList.add("visible");
    }
  });
  window.scrollTo(0, 0);
}

let loadVersion = 0;
async function loadAccountLibrary(userId: string): Promise<void> {
  const version = ++loadVersion;
  root!.innerHTML = /* HTML */ `<main class="frame auth-loading" role="status">
    Loading your library…
  </main>`;
  try {
    const { getLibrary } = await import("./services/library");
    const data = await getLibrary();
    if (version !== loadVersion || accountId !== userId) return;
    enterLibrary(true, data);
  } catch {
    if (version !== loadVersion || accountId !== userId) return;
    root!.innerHTML = /* HTML */ `<main class="frame auth-loading">
      <div class="empty">
        <h1>Couldn’t load your library</h1>
        <p role="alert">Please check your connection and try again.</p>
        <button class="button primary" id="retry-library">Try again</button>
        <button class="button secondary" id="leave-library">Sign out</button>
      </div>
    </main>`;
    document.querySelector("#retry-library")!.addEventListener("click", () => {
      void loadAccountLibrary(userId);
    });
    document
      .querySelector("#leave-library")!
      .addEventListener("click", async () => {
        const { signOut } = await import("./services/auth");
        try {
          await signOut();
        } catch {
          document.querySelector('[role="alert"]')!.textContent =
            "Couldn’t sign out. Please try again.";
        }
      });
  }
}

function showAuth(message?: string): void {
  root!.innerHTML = renderAuthView();
  initializeAuthView((authenticated) => {
    // A configured client drives authenticated navigation via its auth events.
    if (!authenticated) enterLibrary();
  });
  if (message) {
    const status = document.querySelector<HTMLElement>("#auth-status")!;
    status.classList.add("auth-error");
    status.textContent = message;
  }
}

async function start(): Promise<void> {
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    showAuth();
    return;
  }
  root!.innerHTML = /* HTML */ `<main class="frame auth-loading" role="status">
    Opening your listening journal…
  </main>`;
  try {
    const { onAuthStateChange } = await import("./services/auth");
    const subscription = onAuthStateChange((event, session) => {
      // Supabase invokes this callback while holding its auth lock. Keep it
      // synchronous and do not call another auth method from here.
      if (session) {
        if (accountId === session.user.id) return;
        accountId = session.user.id;
        if (libraryMounted) {
          window.location.reload();
          return;
        }
        // Start reads after Supabase releases the auth callback lock.
        setTimeout(() => {
          if (accountId === session.user.id)
            void loadAccountLibrary(session.user.id);
        }, 0);
      } else if (event === "SIGNED_OUT" && !signingOut) {
        accountId = null;
        ++loadVersion;
        window.location.reload();
      } else if (event === "INITIAL_SESSION" && !libraryMounted) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const error = params.get("error_description");
        if (error) {
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
        showAuth(error ?? undefined);
      }
    });
    stopAuth = () => subscription.unsubscribe();
  } catch {
    showAuth(
      "Couldn’t initialize account access. Please refresh to try again, or explore the demo.",
    );
  }
}

void start();
if (import.meta.hot) import.meta.hot.dispose(() => stopAuth?.());
