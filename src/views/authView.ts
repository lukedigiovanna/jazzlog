type AuthMode = "signin" | "signup";

export function renderAuthView(): string {
  return /* HTML */ `
    <a class="skip-link" href="#auth-title">Skip to sign in</a>
    <header class="frame auth-header">
      <a class="brand" href="./" aria-label="JazzLog home"
        ><img src="./favicon.svg" alt="" width="38" height="38" /><span
          >JazzLog<span class="brand-period">.</span></span
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
          A home for the jazz you love. Keep your collection close, capture what
          you hear, and find your way back to a great record.
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
      JazzLog <span aria-hidden="true">·</span> Made for listening closely.
    </footer>
  `;
}

export function initializeAuthView(
  enterLibrary: (authenticated?: boolean) => void,
): void {
  let mode: AuthMode = "signin";
  let busy = false;
  const form = document.querySelector<HTMLFormElement>("#auth-form")!;
  const password = document.querySelector<HTMLInputElement>("#auth-password")!;
  const submit = form.querySelector<HTMLButtonElement>("[type=submit]")!;
  const status = document.querySelector<HTMLElement>("#auth-status")!;
  const demo = document.querySelector<HTMLButtonElement>("#auth-demo")!;
  const tabs = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-auth-mode]"),
  ];

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      if (busy) return;
      mode = tab.dataset.authMode as AuthMode;
      const signingUp = mode === "signup";
      tabs.forEach((item) =>
        item.setAttribute("aria-pressed", String(item === tab)),
      );
      document.querySelector("#auth-title")!.textContent = signingUp
        ? "Make yourself at home."
        : "Welcome back.";
      document.querySelector("#auth-description")!.textContent = signingUp
        ? "Start your own listening journal."
        : "Pick up where you left off.";
      password.autocomplete = signingUp ? "new-password" : "current-password";
      password.minLength = signingUp ? 8 : 1;
      password.setAttribute("aria-describedby", "auth-password-help");
      document.querySelector<HTMLElement>("#auth-password-help")!.hidden =
        !signingUp;
      submit.textContent = signingUp ? "Create account →" : "Sign in →";
      status.textContent = "";
      password.value = "";
    });
  }

  demo.addEventListener("click", () => {
    if (!busy) enterLibrary();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    submit.disabled = true;
    demo.disabled = true;
    tabs.forEach((tab) => (tab.disabled = true));
    form.setAttribute("aria-busy", "true");
    status.textContent = "";
    status.classList.remove("auth-error");
    submit.textContent =
      mode === "signup" ? "Creating account…" : "Signing in…";
    try {
      if (
        !import.meta.env.VITE_SUPABASE_URL ||
        !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ) {
        throw new Error(
          "Account access is not configured yet. You can explore the demo library in the meantime.",
        );
      }
      const auth = await import("../services/auth");
      const email = (new FormData(form).get("email") as string).trim();
      const data = await (mode === "signup"
        ? auth.signUp(email, password.value)
        : auth.signIn(email, password.value));
      if (data.session) {
        enterLibrary(true);
      } else if (mode === "signup") {
        status.textContent =
          "Check your email to confirm your account, then come back to sign in.";
        password.value = "";
      } else {
        throw new Error("Sign in did not create a session. Please try again.");
      }
    } catch (error) {
      status.classList.add("auth-error");
      status.textContent =
        error instanceof Error
          ? error.message
          : "We couldn’t connect. Please try again.";
    } finally {
      busy = false;
      submit.disabled = false;
      demo.disabled = false;
      tabs.forEach((tab) => (tab.disabled = false));
      form.removeAttribute("aria-busy");
      submit.textContent = mode === "signup" ? "Create account →" : "Sign in →";
    }
  });
}
