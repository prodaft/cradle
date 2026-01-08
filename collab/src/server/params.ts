type ConnectionParams = {
  noteId: string;
  token: string;
};

type ParseResult =
  | { ok: true; value: ConnectionParams }
  | { ok: false; error: string };

const stripLeadingSlash = (value: string): string => value.replace(/^\/+/, "");

export function parseConnectionParams(
  pathname: string,
  basePath: string,
  headers: Record<string, string | string[] | undefined>
): ParseResult {
  const noteId = parseNoteId(pathname, basePath);
  if (!noteId) {
    return { ok: false, error: "Missing note_id" };
  }

  const token = parseAuthToken(headers);
  if (!token) {
    return { ok: false, error: "Missing Authorization token" };
  }

  return { ok: true, value: { noteId, token } };
}

function parseNoteId(pathname: string, basePath: string): string | null {
  const normalizedPath = stripLeadingSlash(pathname);
  const normalizedBase = stripLeadingSlash(basePath);

  if (!normalizedBase) {
    return normalizedPath.split("/")[0] || null;
  }

  if (!normalizedPath.startsWith(normalizedBase)) {
    return null;
  }

  const remainder = stripLeadingSlash(
    normalizedPath.slice(normalizedBase.length)
  );
  return remainder.split("/")[0] || null;
}

function parseAuthToken(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const headerValue =
    headers["authorization"] || headers["Authorization"];
  const auth = Array.isArray(headerValue)
    ? headerValue.join(",")
    : headerValue;

  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }

  const protocolHeader =
    headers["sec-websocket-protocol"] || headers["Sec-WebSocket-Protocol"];
  const protocolValue = Array.isArray(protocolHeader)
    ? protocolHeader.join(",")
    : protocolHeader;
  if (!protocolValue) {
    return null;
  }
  const parts = protocolValue.split(",").map((part) => part.trim());
  if (parts.length >= 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1] || null;
  }
  return null;
}
