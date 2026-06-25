import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  formatActivationStage,
  formatCommercialCloseStage,
  getComparableDate,
  getDemoRequestCommerceSnapshot,
  getRealOnboardingRecord,
  isQaDemoRequest
} from "../src/platformReadiness.js";

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

async function loadPlatformData() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: creatorEmail,
    password: creatorPassword
  });

  if (signInError) {
    throw signInError;
  }

  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user?.id) {
    throw new Error("Creator auth failed.");
  }

  const [
    { data: platformAdminData, error: platformAdminError },
    { data: companiesData, error: companiesError },
    { data: subscriptionsData, error: subscriptionsError },
    { data: demoRequestsData, error: demoRequestsError },
    { data: subscriptionEventsData, error: subscriptionEventsError }
  ] = await Promise.all([
    supabase.from("platform_admins").select("id").eq("user_id", profile.user.id).eq("is_active", true).maybeSingle(),
    supabase.from("companies").select("id, name, slug, is_demo, business_type, status, contact_email, contact_phone, created_at").order("created_at", { ascending: true }),
    supabase.from("company_subscriptions").select("*").order("created_at", { ascending: true }),
    supabase.from("platform_demo_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("company_subscription_events").select("*").order("created_at", { ascending: false })
  ]);

  if (platformAdminError) throw platformAdminError;
  if (!platformAdminData?.id) throw new Error("Current user is not an active platform admin.");
  if (companiesError) throw companiesError;
  if (subscriptionsError) throw subscriptionsError;
  if (demoRequestsError) throw demoRequestsError;
  if (subscriptionEventsError) throw subscriptionEventsError;

  const companies = companiesData || [];
  const companyIds = companies.map((company) => company.id).filter(Boolean);
  const [
    { data: ownerMembershipsData, error: ownerMembershipsError },
    { data: platformMembersData, error: platformMembersError },
    { data: platformServicesData, error: platformServicesError }
  ] = await Promise.all([
    supabase
      .from("company_members")
      .select("company_id, user_id, role, is_active, created_at")
      .in("company_id", companyIds)
      .eq("role", "owner")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase.from("company_members").select("company_id, role, is_active").in("company_id", companyIds),
    supabase.from("services").select("company_id, is_active").in("company_id", companyIds)
  ]);

  if (ownerMembershipsError) throw ownerMembershipsError;
  if (platformMembersError) throw platformMembersError;
  if (platformServicesError) throw platformServicesError;

  const countsByCompanyId = new Map();
  const firstOwnerByCompanyId = new Map();

  function ensureCompanyCounts(companyId) {
    if (!countsByCompanyId.has(companyId)) {
      countsByCompanyId.set(companyId, {
        active_staff_members_count: 0,
        services_count: 0
      });
    }
    return countsByCompanyId.get(companyId);
  }

  for (const membership of ownerMembershipsData || []) {
    if (!firstOwnerByCompanyId.has(membership.company_id)) {
      firstOwnerByCompanyId.set(membership.company_id, membership);
    }
  }

  for (const membership of platformMembersData || []) {
    const bucket = ensureCompanyCounts(membership.company_id);
    if (!membership.is_active) {
      continue;
    }
    if (membership.role === "manager" || membership.role === "detailer") {
      bucket.active_staff_members_count += 1;
    }
  }

  for (const service of platformServicesData || []) {
    const bucket = ensureCompanyCounts(service.company_id);
    if (service.is_active !== false) {
      bucket.services_count += 1;
    }
  }

  const enrichedCompanies = companies.map((company) => {
    const usage = countsByCompanyId.get(company.id) || {};
    const ownerMembership = firstOwnerByCompanyId.get(company.id) || null;

    return {
      ...company,
      owner_connected_at: ownerMembership?.created_at || null,
      active_staff_members_count: usage.active_staff_members_count || 0,
      services_count: usage.services_count || 0
    };
  });

  return {
    companies: enrichedCompanies,
    subscriptions: subscriptionsData || [],
    demoRequests: demoRequestsData || [],
    subscriptionEvents: subscriptionEventsData || []
  };
}

function buildReport({ companies, subscriptions, demoRequests, subscriptionEvents }) {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const subscriptionsByCompanyId = new Map(subscriptions.map((subscription) => [subscription.company_id, subscription]));
  const subscriptionEventsByCompanyId = new Map();

  for (const event of subscriptionEvents) {
    if (!event?.company_id) {
      continue;
    }
    const current = subscriptionEventsByCompanyId.get(event.company_id) || [];
    current.push(event);
    subscriptionEventsByCompanyId.set(event.company_id, current);
  }

  const realRequests = demoRequests.filter((request) => !isQaDemoRequest(request) && (request.status || "new") !== "archived");
  const rows = realRequests
    .map((request) =>
      getRealOnboardingRecord({
        request,
        companiesById,
        subscriptionsByCompanyId,
        subscriptionEventsByCompanyId
      })
    )
    .sort((left, right) => right.priority - left.priority || getComparableDate(right.request.created_at) - getComparableDate(left.request.created_at));

  const summary = {
    total_real_leads: rows.length,
    needs_action: rows.filter((item) => item.requiresAction).length,
    company_missing: rows.filter((item) => item.queueKey === "company").length,
    subscription_or_plan: rows.filter((item) => item.queueKey === "subscription" || item.queueKey === "plan").length,
    launch_prep: rows.filter((item) => item.queueKey === "launch" || item.queueKey === "activation" || item.queueKey === "handoff_close").length,
    commercial_close: rows.filter((item) => ["commercial", "invoice_send", "invoice_followup", "payment_paused"].includes(item.queueKey)).length,
    paid_ready: rows.filter((item) => item.queueKey === "paid_ready").length
  };

  const focus = rows[0]
    ? {
        company: rows[0].company?.name || null,
        lead_name: rows[0].request.company_name || rows[0].request.name || null,
        lead_phone: rows[0].request.phone || null,
        queue: rows[0].queueLabel,
        next_step: rows[0].nextStep,
        activation_stage: formatActivationStage(rows[0].activation.stage),
        commercial_stage: formatCommercialCloseStage(rows[0].commercialStage)
      }
    : null;

  const queues = {
    company_missing: rows
      .filter((item) => item.queueKey === "company")
      .slice(0, 10)
      .map((item) => ({
        lead: item.request.company_name || item.request.name,
        phone: item.request.phone || null,
        plan: getDemoRequestCommerceSnapshot(item.request).plan || null,
        billing: getDemoRequestCommerceSnapshot(item.request).billing || null,
        next_step: item.nextStep
      })),
    subscription_or_plan: rows
      .filter((item) => item.queueKey === "subscription" || item.queueKey === "plan")
      .slice(0, 10)
      .map((item) => ({
        company: item.company?.name || null,
        lead: item.request.company_name || item.request.name,
        queue: item.queueLabel,
        next_step: item.nextStep
      })),
    launch_prep: rows
      .filter((item) => item.queueKey === "launch" || item.queueKey === "activation" || item.queueKey === "handoff_close")
      .slice(0, 10)
      .map((item) => ({
        company: item.company?.name || null,
        queue: item.queueLabel,
        next_step: item.nextStep,
        blockers: item.blockers.map((blocker) => blocker.label)
      })),
    commercial_close: rows
      .filter((item) => ["commercial", "invoice_send", "invoice_followup", "payment_paused"].includes(item.queueKey))
      .slice(0, 10)
      .map((item) => ({
        company: item.company?.name || null,
        queue: item.queueLabel,
        commercial_stage: formatCommercialCloseStage(item.commercialStage),
        billing_status: item.billingStatus,
        next_step: item.nextStep
      })),
    paid_ready: rows
      .filter((item) => item.queueKey === "paid_ready")
      .slice(0, 10)
      .map((item) => ({
        company: item.company?.name || null,
        billing_status: item.billingStatus,
        next_step: item.nextStep
      }))
  };

  return {
    generated_at: new Date().toISOString(),
    focus,
    summary,
    queues
  };
}

async function main() {
  const data = await loadPlatformData();
  const report = buildReport(data);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
