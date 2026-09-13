export function ensurePromiseWithResolvers(): void {
  if (typeof Promise.withResolvers === "function") return;
  // pdf.js (via unpdf) needs this; Node 20 and some test hosts omit it.
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
