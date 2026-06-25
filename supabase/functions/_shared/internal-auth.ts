export function requireInternalToken(request: Request, envKey = "ALERT_INTERNAL_TOKEN") {
  const internalToken = Deno.env.get(envKey)?.trim();

  if (!internalToken) {
    return new Response(
      JSON.stringify(
        {
          error: `${envKey} is not configured.`
        },
        null,
        2
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const provided = request.headers.get("x-internal-token");
  if (provided !== internalToken) {
    return new Response(
      JSON.stringify(
        {
          error: "Нет доступа."
        },
        null,
        2
      ),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  return null;
}
