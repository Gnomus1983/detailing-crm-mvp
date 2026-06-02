export async function createAutomationRun(
  supabase: any,
  input: {
    automation_key: string;
    status: "started" | "success" | "error" | "skipped";
    scope_key?: string | null;
    lead_id?: string | null;
    payload?: Record<string, unknown>;
    error_message?: string | null;
  }
) {
  return supabase.from("automation_runs").insert({
    automation_key: input.automation_key,
    status: input.status,
    scope_key: input.scope_key ?? null,
    lead_id: input.lead_id ?? null,
    payload: input.payload ?? {},
    error_message: input.error_message ?? null
  });
}
