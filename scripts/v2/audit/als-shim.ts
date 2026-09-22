// next/server's work-async-storage needs globalThis.AsyncLocalStorage outside the Next runtime.
import { AsyncLocalStorage } from "node:async_hooks";
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
