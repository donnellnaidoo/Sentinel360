// Turns tRPC client errors into copy an officer can act on. The API already
// writes human sentences for business-rule failures (see the docket
// guardrails in packages/api/src/routers/cases.ts); this covers the rest —
// permissions, validation, sessions and the network.

type ErrorData = {
  code?: string;
  httpStatus?: number;
  fieldErrors?: Record<string, string[] | undefined> | null;
};

function errorData(error: unknown): ErrorData | undefined {
  if (error && typeof error === "object" && "data" in error) {
    return (error as { data?: ErrorData }).data;
  }
  return undefined;
}

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "";
}

const PERMISSION_LABELS: Record<string, string> = {
  "cases:read": "view cases",
  "cases:create": "open cases",
  "cases:update": "update cases",
  "evidence:read": "view evidence",
  "evidence:create": "upload evidence",
  "profiles:read": "search profiles",
};

export function getFieldErrors(error: unknown): Record<string, string> {
  const fieldErrors = errorData(error)?.fieldErrors ?? {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) out[field] = messages[0];
  }
  return out;
}

export function getErrorCode(error: unknown): string | undefined {
  return errorData(error)?.code;
}

export function isRestrictedCase(error: unknown): boolean {
  return getErrorCode(error) === "FORBIDDEN" && rawMessage(error).includes("restricted");
}

export function getErrorMessage(error: unknown): string {
  const data = errorData(error);
  const message = rawMessage(error);

  if (!data) {
    // No tRPC envelope at all: the request never reached the API.
    if (error instanceof TypeError || /fetch|network/i.test(message)) {
      return "Can't reach the server. Check your connection and try again.";
    }
    return message || "Something went wrong. Please try again.";
  }

  switch (data.code) {
    case "UNAUTHORIZED":
      return "Your session has expired. Sign in again to continue.";
    case "FORBIDDEN": {
      const permission = message.match(/Missing required permission: (\S+)/)?.[1];
      if (permission) {
        return `You don't have permission to ${PERMISSION_LABELS[permission] ?? "do this"}. Ask an administrator for access.`;
      }
      return message || "You don't have permission to do this.";
    }
    case "NOT_FOUND":
      return message || "This record no longer exists.";
    case "INTERNAL_SERVER_ERROR":
      console.error(error);
      return "Something went wrong on our side while saving. Please try again.";
    case "BAD_REQUEST":
      // Zod failures carry fieldErrors and a JSON-dump message; forms show
      // the per-field errors, so summarise rather than echo the dump.
      if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        return "Some fields need attention — see the highlighted fields below.";
      }
      return message;
    default:
      return message || "Something went wrong. Please try again.";
  }
}
