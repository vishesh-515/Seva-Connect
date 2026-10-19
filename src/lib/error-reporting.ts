export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const details = {
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
    route: window.location.pathname,
    ...context,
  };
  console.error("[Seva Connect Error]", details);
}
