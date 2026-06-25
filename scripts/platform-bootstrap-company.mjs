import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function resolveEnvPath() {
  const candidates = [
    path.join(projectRoot, ".env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "detailing-crm-mvp", ".env")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function loadEnv() {
  const envPath = resolveEnvPath();
  const fileText = envPath && fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const fileEnv = Object.fromEntries(
    fileText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );

  return {
    ...fileEnv,
    ...process.env
  };
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const creatorEmail = env.CREATOR_TEST_EMAIL;
const creatorPassword = env.CREATOR_TEST_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing.");
}

if (!creatorEmail || !creatorPassword) {
  throw new Error("CREATOR_TEST_EMAIL or CREATOR_TEST_PASSWORD is missing.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const args = process.argv.slice(2);

function readArg(name) {
  const prefix = `${name}=`;
  const valueArg = args.find((entry) => entry.startsWith(prefix));
  return valueArg ? valueArg.slice(prefix.length) : "";
}

const targetSlug = readArg("--slug");
const billingStatusArg = readArg("--billing") || "manual";

const planPriceByCode = {
  starter: 29,
  pro: 59,
  studio: 129
};

function plusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: creatorEmail,
    password: creatorPassword
  });

  if (signInError) {
    throw signInError;
  }

  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;

  if (!currentUserId) {
    throw new Error("Creator auth failed.");
  }

  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, is_demo, status, plan_code, contact_email, contact_phone, created_at")
    .eq("is_demo", false)
    .order("created_at", { ascending: true })
    .limit(1);

  if (targetSlug) {
    companyQuery = supabase
      .from("companies")
      .select("id, name, slug, is_demo, status, plan_code, contact_email, contact_phone, created_at")
      .eq("slug", targetSlug)
      .maybeSingle();
  }

  const companyResult = await companyQuery;
  if (companyResult.error) {
    throw companyResult.error;
  }

  const company = targetSlug ? companyResult.data : companyResult.data?.[0];

  if (!company?.id) {
    throw new Error(targetSlug ? `Company not found for slug: ${targetSlug}` : "No real company found.");
  }

  const { data: existingSubscription, error: subscriptionLoadError } = await supabase
    .from("company_subscriptions")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  if (subscriptionLoadError) {
    throw subscriptionLoadError;
  }

  const planCode = existingSubscription?.plan_code || company.plan_code || "starter";
  const priceMonthly = existingSubscription?.price_monthly ?? planPriceByCode[planCode] ?? null;
  const startsAt = existingSubscription?.starts_at || new Date().toISOString();
  const trialEndsAt = existingSubscription?.trial_ends_at || plusDays(30);
  const renewsAt =
    billingStatusArg === "manual"
      ? existingSubscription?.renews_at || plusDays(30)
      : existingSubscription?.renews_at || null;
  const notesPrefix = existingSubscription?.notes?.trim() || "";
  const noteText =
    billingStatusArg === "manual"
      ? "Creator CLI bootstrap: company moved to manual billing ready."
      : "Creator CLI bootstrap: company subscription created.";
  const notes = [notesPrefix, noteText].filter(Boolean).join(" | ");

  const companyPayload = {
    status: company.status === "archived" ? "paused" : company.status || "active",
    plan_code: planCode
  };

  const { data: updatedCompany, error: companyUpdateError } = await supabase
    .from("companies")
    .update(companyPayload)
    .eq("id", company.id)
    .select("id, name, slug, is_demo, status, plan_code")
    .maybeSingle();

  if (companyUpdateError) {
    throw companyUpdateError;
  }

  const subscriptionPayload = {
    company_id: company.id,
    plan_code: planCode,
    billing_status: billingStatusArg,
    price_monthly: priceMonthly,
    starts_at: startsAt,
    trial_ends_at: trialEndsAt,
    renews_at: renewsAt,
    notes
  };

  const { data: updatedSubscription, error: subscriptionUpsertError } = await supabase
    .from("company_subscriptions")
    .upsert(subscriptionPayload, { onConflict: "company_id" })
    .select("*")
    .maybeSingle();

  if (subscriptionUpsertError) {
    throw subscriptionUpsertError;
  }

  const eventType = existingSubscription ? "manual_prepared" : "created";
  const eventNote =
    billingStatusArg === "manual"
      ? "Creator CLI prepared manual billing for the company."
      : "Creator CLI created the first company subscription.";

  const { error: eventError } = await supabase.from("company_subscription_events").insert({
    company_id: company.id,
    subscription_id: updatedSubscription?.id || null,
    event_type: eventType,
    note: eventNote,
    payload: {
      status: updatedCompany?.status || companyPayload.status,
      plan_code: planCode,
      billing_status: billingStatusArg,
      price_monthly: priceMonthly,
      starts_at: startsAt,
      trial_ends_at: trialEndsAt,
      renews_at: renewsAt,
      source: "platform-bootstrap-company-cli"
    },
    created_by: currentUserId
  });

  if (eventError) {
    throw eventError;
  }

  console.log(
    JSON.stringify(
      {
        company: updatedCompany?.name || company.name,
        slug: updatedCompany?.slug || company.slug,
        plan_code: planCode,
        billing_status: billingStatusArg,
        price_monthly: priceMonthly,
        subscription_id: updatedSubscription?.id || null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
