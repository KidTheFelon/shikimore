import type { ApiError } from "../types";

export function handleApiError(err: unknown): string {
  if (typeof err === "object" && err !== null && "kind" in err) {
    const apiError = err as ApiError;
    let message = apiError.message;

    if (apiError.kind === "rate_limit" && apiError.retry_after) {
      message += ` (Повторить через ${apiError.retry_after} сек)`;
    } else if (apiError.kind === "graphql" && apiError.details) {
      console.debug("GraphQL error details:", apiError.details);
    } else if (apiError.kind === "http" && apiError.details) {
      const details = apiError.details as { status?: number; url?: string };
      if (details.status) {
        message += ` (Статус: ${details.status})`;
      }
    } else if (apiError.kind === "api" && apiError.details) {
      const details = apiError.details as { status?: number };
      if (details.status) {
        message += ` (Статус: ${details.status})`;
      }
    }

    return message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Ошибка загрузки контента";
}
