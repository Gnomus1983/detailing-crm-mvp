const defaultLocalOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const configuredOrigins = (Deno.env.get("PUBLIC_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
  const publicAppUrl = normalizeOrigin(Deno.env.get("PUBLIC_APP_URL") || "");

  return [...new Set([publicAppUrl, ...configuredOrigins, ...defaultLocalOrigins].filter(Boolean))];
}

export function buildCorsHeaders(request: Request) {
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));
  const allowedOrigins = getAllowedOrigins();
  const fallbackOrigin = allowedOrigins[0] || defaultLocalOrigins[0];
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin"
  };
}
