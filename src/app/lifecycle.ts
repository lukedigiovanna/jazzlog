/** Owns listeners and guards queued work after teardown. */
export function createLifecycle(deferred = false) {
  const abort = new AbortController();
  const pending: (() => void)[] = [];
  let mounted = !deferred;
  return {
    mount() {
      if (mounted || abort.signal.aborted) return;
      mounted = true;
      pending.splice(0).forEach((register) => register());
    },
    get active() {
      return !abort.signal.aborted;
    },
    listen<T extends EventTarget>(target: T): T {
      return new Proxy(target, {
        get(object, key) {
          if (key === "addEventListener")
            return (
              type: string,
              listener: EventListener,
              options?: boolean | AddEventListenerOptions,
            ) => {
              const register = () =>
                object.addEventListener(type, listener, {
                  ...(typeof options === "boolean"
                    ? { capture: options }
                    : options),
                  signal: abort.signal,
                });
              if (mounted) register();
              else pending.push(register);
            };
          const value = Reflect.get(object, key, object);
          return typeof value === "function" ? value.bind(object) : value;
        },
      });
    },
    queue(callback: () => void) {
      queueMicrotask(() => {
        if (!abort.signal.aborted) callback();
      });
    },
    dispose() {
      abort.abort();
      pending.length = 0;
    },
  };
}
