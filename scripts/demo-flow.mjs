import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  addLeadNoteRecord,
  createLeadEvent,
  createLeadRecord,
  createOrReuseClient,
  sendN8nWebhook,
  updateLeadFollowUpRecord,
  updateLeadStatusRecord
} from "../src/crm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const envText = fs.readFileSync(envPath, "utf8");
const fileEnv = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const env = {
  ...fileEnv,
  ...process.env
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const webhookUrl = env.VITE_N8N_WEBHOOK_URL;
const capturedWebhooks = [];

function startMockWebhookServer(urlString) {
  const url = new URL(urlString);

  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        });
        response.end();
        return;
      }

      if (request.method !== "POST" || request.url !== `${url.pathname}${url.search}`) {
        response.writeHead(404, {
          "Access-Control-Allow-Origin": "*"
        });
        response.end("Not found");
        return;
      }

      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        try {
          capturedWebhooks.push(JSON.parse(body || "{}"));
        } catch (error) {
          capturedWebhooks.push({ parse_error: error.message, raw: body });
        }

        response.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
        response.end(JSON.stringify({ ok: true }));
      });
    });

    server.listen(Number(url.port || 80), url.hostname, () => resolve(server));
  });
}

async function ensureSession() {
  if (env.SUPABASE_ACCESS_TOKEN && env.SUPABASE_REFRESH_TOKEN) {
    const { data, error } = await supabase.auth.setSession({
      access_token: env.SUPABASE_ACCESS_TOKEN,
      refresh_token: env.SUPABASE_REFRESH_TOKEN
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      return data.session;
    }
  }

  const email = `crmflow${Date.now()}@gmail.com`;
  const password = "DemoFlow123!";
  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Demo Flow Operator"
      }
    }
  });

  if (signUpResult.error) {
    throw signUpResult.error;
  }

  let session = signUpResult.data.session;

  if (!session) {
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInResult.error) {
      throw signInResult.error;
    }

    session = signInResult.data.session;
  }

  if (!session) {
    throw new Error("Failed to create authenticated demo session.");
  }

  return session;
}

async function main() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase env vars.");
  }

  if (!webhookUrl) {
    throw new Error("Missing VITE_N8N_WEBHOOK_URL in .env.");
  }

  const webhookServer = await startMockWebhookServer(webhookUrl);

  try {
    const session = await ensureSession();
    const userId = session.user.id;

    const { data: services, error: servicesError } = await supabase.from("services").select("*").order("name", { ascending: true }).limit(1);
    if (servicesError) {
      throw servicesError;
    }

    const service = services?.[0];
    if (!service) {
      throw new Error("No services found for demo flow.");
    }

    const demoPhone = `+37379${String(Date.now()).slice(-6)}`;
    const demoForm = {
      client_name: "Victor Sandu",
      phone: demoPhone,
      email: "victor.sandu.demo@example.com",
      car_make: "Audi",
      car_model: "Q7",
      car_year: "2020",
      car_plate: "CDE777",
      service_id: service.id,
      source: "instagram",
      address: "Ciocana, Chisinau",
      comment: "Client wants a premium wash before weekend trip.",
      preferred_date: "2026-06-02",
      preferred_time: "09:30",
      estimated_price: "120",
      follow_up_at: "2026-06-01T10:15"
    };

    const { client: createdClient, reused: firstReuse } = await createOrReuseClient(supabase, demoForm);
    const createdLead = await createLeadRecord(supabase, createdClient.id, demoForm);

    await createLeadEvent(supabase, {
      lead_id: createdLead.id,
      type: "created",
      note: `Lead created from ${demoForm.source}`,
      payload: {
        source: demoForm.source,
        service_id: createdLead.service_id,
        follow_up_at: createdLead.follow_up_at
      },
      created_by: userId
    });

    await createLeadEvent(supabase, {
      lead_id: createdLead.id,
      type: "note_added",
      note: demoForm.comment,
      payload: {
        origin: "lead_create"
      },
      created_by: userId
    });

    await sendN8nWebhook(webhookUrl, {
      event: "lead_created",
      lead: createdLead,
      client: createdClient
    });

    const { client: reusedClient, reused: secondReuse } = await createOrReuseClient(supabase, {
      ...demoForm,
      comment: "Existing client updated during reuse check."
    });

    const { error: statusError } = await updateLeadStatusRecord(supabase, createdLead.id, "quoted");
    if (statusError) {
      throw statusError;
    }

    await createLeadEvent(supabase, {
      lead_id: createdLead.id,
      type: "status_changed",
      note: "Status changed from new to quoted",
      payload: {
        from: "new",
        to: "quoted"
      },
      created_by: userId
    });

    const noteResult = await addLeadNoteRecord(supabase, createdLead.id, "Quote sent for full exterior refresh package.", userId);
    if (noteResult.error) {
      throw noteResult.error;
    }

    const { error: followUpError, followUpAt } = await updateLeadFollowUpRecord(supabase, createdLead.id, "2026-06-01T16:45");
    if (followUpError) {
      throw followUpError;
    }

    await createLeadEvent(supabase, {
      lead_id: createdLead.id,
      type: "follow_up_set",
      note: `Follow-up set for ${followUpAt}`,
      payload: {
        follow_up_at: followUpAt
      },
      created_by: userId
    });

    const { data: refreshedLead, error: refreshedLeadError } = await supabase
      .from("leads")
      .select("*, clients(*), services(*)")
      .eq("id", createdLead.id)
      .single();
    if (refreshedLeadError) {
      throw refreshedLeadError;
    }

    await sendN8nWebhook(webhookUrl, {
      event: "follow_up_updated",
      lead: refreshedLead
    });

    const { data: events, error: eventsError } = await supabase
      .from("lead_events")
      .select("*")
      .eq("lead_id", createdLead.id)
      .order("created_at", { ascending: true });
    if (eventsError) {
      throw eventsError;
    }

    const summary = {
      auth_user_id: userId,
      created_client_id: createdClient.id,
      reused_client_id: reusedClient.id,
      created_lead_id: createdLead.id,
      first_create_reused_existing_client: firstReuse,
      second_create_reused_existing_client: secondReuse,
      final_status: refreshedLead.status,
      final_follow_up_at: refreshedLead.follow_up_at,
      lead_events_count: events.length,
      lead_event_types: events.map((item) => item.type),
      webhook_events_captured: capturedWebhooks.map((item) => item.event),
      webhook_payload_count: capturedWebhooks.length
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await supabase.auth.signOut();
    webhookServer.close();
  }
}

main().catch((error) => {
  if (error?.code === "email_not_confirmed") {
    console.error("Email confirmation is enabled in Supabase. Re-run demo:flow with a valid owner session via SUPABASE_ACCESS_TOKEN and SUPABASE_REFRESH_TOKEN.");
  } else if (error?.code === "over_email_send_rate_limit") {
    console.error("Supabase email rate limit is active. Re-run demo:flow with a valid owner session via SUPABASE_ACCESS_TOKEN and SUPABASE_REFRESH_TOKEN.");
  } else {
    console.error(error);
  }
  process.exit(1);
});
