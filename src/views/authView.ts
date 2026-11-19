import { createLifecycle } from "../app/lifecycle";
import { renderBrandLogo } from "../components/brandLogo";

type AuthMode = "signin" | "signup";

export function renderAuthView(): string {
  return /* HTML */ `
    <a class="skip-link" href="#auth-title">Skip to sign in</a>
    <header class="frame auth-header">
      <a class="brand" href="./" aria-label="Sleeve home"
        >${renderBrandLogo()}<span class="brand-wordmark"
          >Sleeve<span class="brand-period">.</span></span
        ></a
      >
      <button class="auth-text-button" type="button" id="auth-demo">
        Explore the demo <span aria-hidden="true">↗</span>
      </button>
    </header>
    <main class="frame auth-layout">
      <section class="auth-intro" aria-labelledby="auth-intro-title">
        <h1 id="auth-intro-title">Good records.<br />Lasting impressions.</h1>
        <p class="auth-description">
          A home for every album you discover. Build your collection, capture
          what you hear, and reflect on the records that stay with you.
        </p>
        <div class="auth-records" aria-hidden="true">
          <img src="./art/blue-train.svg" alt="" />
          <img src="./art/kind-of-blue.svg" alt="" />
          <img src="./art/head-hunters.svg" alt="" />
        </div>
        <p class="auth-caption">Every listen has a story. Keep yours.</p>
      </section>
      <section class="auth-card" aria-labelledby="auth-title">
        <div class="auth-tabs" aria-label="Account access">
          <button type="button" data-auth-mode="signin" aria-pressed="true">
            Sign in
          </button>
          <button type="button" data-auth-mode="signup" aria-pressed="false">
            Create account
          </button>
        </div>
        <h2 id="auth-title" tabindex="-1">Welcome back.</h2>
        <p id="auth-description">Pick up where you left off.</p>
        <form id="auth-form">
          <label for="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
          <label for="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <p class="auth-password-help" id="auth-password-help" hidden>
            Use at least 8 characters.
          </p>
          <p
            class="auth-status"
            id="auth-status"
            role="status"
            aria-live="polite"
          ></p>
          <button type="submit" class="button primary auth-submit">
            Sign in <span aria-hidden="true">→</span>
          </button>
        </form>
        <p class="auth-note">Your next great listen deserves a place.</p>
      </section>
    </main>
    <footer class="frame auth-footer">
      Sleeve <span aria-hidden="true">·</span> Made for listening closely.
    </footer>
  `;
}

export interface AuthSessionResult {
  session: object | null;
}

export interface AuthViewDependencies {
  enterLibrary: (authenticated?: boolean) => void;
  authenticate: (
    mode: AuthMode,
    email: string,
    password: string,
  ) => Promise<AuthSessionResult>;
}

async function authenticate(
  mode: AuthMode,
  email: string,
  password: string,
): Promise<AuthSessionResult> {
  if (
    !import.meta.env.VITE_SUPABASE_URL ||
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Account access is not configured yet. You can explore the demo library in the meantime.",
    );
  }
  const auth = await import("../services/auth");
  return mode === "signup"
    ? auth.signUp(email, password)
    : auth.signIn(email, password);
}

export class AuthView {
  private mode: AuthMode = "signin";
  private busy = false;
  private readonly lifecycle = createLifecycle();
  private readonly root: ParentNode;
  private readonly dependencies: AuthViewDependencies;
  private readonly form: HTMLFormElement;
  private readonly password: HTMLInputElement;
  private readonly submit: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly demo: HTMLButtonElement;
  private readonly tabs: HTMLButtonElement[];

  constructor(root: ParentNode, dependencies: AuthViewDependencies) {
    this.root = root;
    this.dependencies = dependencies;
    this.form = root.querySelector<HTMLFormElement>("#auth-form")!;
    this.password = root.querySelector<HTMLInputElement>("#auth-password")!;
    this.submit = this.form.querySelector<HTMLButtonElement>("[type=submit]")!;
    this.status = root.querySelector<HTMLElement>("#auth-status")!;
    this.demo = root.querySelector<HTMLButtonElement>("#auth-demo")!;
    this.tabs = [
      ...root.querySelectorAll<HTMLButtonElement>("[data-auth-mode]"),
    ];

    for (const tab of this.tabs) {
      this.lifecycle
        .listen(tab)
        .addEventListener("click", () => this.changeMode(tab));
    }
    this.lifecycle.listen(this.demo).addEventListener("click", () => {
      if (!this.busy) this.dependencies.enterLibrary();
    });
    this.lifecycle.listen(this.form).addEventListener("submit", (event) => {
      event.preventDefault();
      void this.signIn();
    });
  }

  private changeMode(tab: HTMLButtonElement): void {
    if (this.busy) return;
    const nextMode = tab.dataset.authMode;
    if (nextMode !== "signin" && nextMode !== "signup") return;
    this.mode = nextMode;
    const signingUp = this.mode === "signup";
    this.tabs.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === tab)),
    );
    this.root.querySelector("#auth-title")!.textContent = signingUp
      ? "Make yourself at home."
      : "Welcome back.";
    this.root.querySelector("#auth-description")!.textContent = signingUp
      ? "Start your own listening journal."
      : "Pick up where you left off.";
    this.password.autocomplete = signingUp
      ? "new-password"
      : "current-password";
    this.password.minLength = signingUp ? 8 : 1;
    this.password.setAttribute("aria-describedby", "auth-password-help");
    this.root.querySelector<HTMLElement>("#auth-password-help")!.hidden =
      !signingUp;
    this.submit.textContent = signingUp ? "Create account →" : "Sign in →";
    this.status.textContent = "";
    this.password.value = "";
  }

  private async signIn(): Promise<void> {
    if (this.busy || !this.lifecycle.active) return;
    this.busy = true;
    this.setBusy(true);
    this.status.textContent = "";
    this.status.classList.remove("auth-error");
    this.submit.textContent =
      this.mode === "signup" ? "Creating account…" : "Signing in…";

    try {
      const email = String(new FormData(this.form).get("email") ?? "").trim();
      const data = await this.dependencies.authenticate(
        this.mode,
        email,
        this.password.value,
      );
      if (!this.lifecycle.active) return;
      if (data.session) {
        this.dependencies.enterLibrary(true);
      } else if (this.mode === "signup") {
        this.status.textContent =
          "Check your email to confirm your account, then come back to sign in.";
        this.password.value = "";
      } else {
        throw new Error("Sign in did not create a session. Please try again.");
      }
    } catch (error) {
      if (!this.lifecycle.active) return;
      this.status.classList.add("auth-error");
      this.status.textContent =
        error instanceof Error
          ? error.message
          : "We couldn’t connect. Please try again.";
    } finally {
      if (this.lifecycle.active) {
        this.busy = false;
        this.setBusy(false);
        this.submit.textContent =
          this.mode === "signup" ? "Create account →" : "Sign in →";
      }
    }
  }

  private setBusy(busy: boolean): void {
    this.submit.disabled = busy;
    this.demo.disabled = busy;
    this.tabs.forEach((tab) => {
      tab.disabled = busy;
    });
    if (busy) this.form.setAttribute("aria-busy", "true");
    else this.form.removeAttribute("aria-busy");
  }

  public dispose(): void {
    this.lifecycle.dispose();
  }
}

export function initializeAuthView(
  enterLibrary: (authenticated?: boolean) => void,
): AuthView {
  return new AuthView(document, { enterLibrary, authenticate });
}
