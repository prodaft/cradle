import crypto from "node:crypto";

export function signRequest(params: {
  secret: string;
  timestamp: string;
  method: string;
  path: string;
  body: string;
}): string {
  const message = `${params.timestamp}.${params.method}.${params.path}.${params.body}`;
  return crypto
    .createHmac("sha256", params.secret)
    .update(message)
    .digest("hex");
}
