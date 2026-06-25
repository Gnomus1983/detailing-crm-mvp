import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  formatActivationStage,
  getComparableDate,
  getCompanyQaRecord,
  getDaysUntil,
  getDemoRequestActivationState,
  getPaidReadinessRecord,
  goLiveBlockerLabels,
  planLabels
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
const strictMode = process.argv.includes("--strict");

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

function getLeadStageKey(status) {
  if (status === "new") return "new";
  if (status === "done") return "done";
  if (status === "lost") return "lost";
  return "in_progress";
}

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

  const companySelect = "id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at";
  const [
    { data: platformAdminData, error: platformAdminError },
    { data: companiesData, error: companiesError },
    { data: subscriptionsData, error: subscriptionsError },
    { data: demoRequestsData, error: demoRequestsError },
    { data: subscriptionEventsData, error: subscriptionEventsError }
  ] = await Promise.all([
    supabase.from("platform_admins").select("id").eq("user_id", profile.user.id).eq("is_active", true).maybeSingle(),
    supabase.from("companies").select(companySelect).order("created_at", { ascending: true }),
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
    { data: platformClientsData, error: platformClientsError },
    { data: platformLeadsData, error: platformLeadsError },
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
    supabase.from("clients").select("company_id").in("company_id", companyIds),
    supabase.from("leads").select("company_id, status").in("company_id", companyIds),
    supabase.from("services").select("company_id, is_active").in("company_id", companyIds)
  ]);

  if (ownerMembershipsError) throw ownerMembershipsError;
  if (platformMembersError) throw platformMembersError;
  if (platformClientsError) throw platformClientsError;
  if (platformLeadsError) throw platformLeadsError;
  if (platformServicesError) throw platformServicesError;

  const ownerUserIds = [...new Set((ownerMembershipsData || []).map((member) => member.user_id).filter(Boolean))];
  const { data: ownerProfilesData, error: ownerProfilesError } = ownerUserIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerUserIds)
    : { data: [], error: null };

  if (ownerProfilesError) throw ownerProfilesError;

  const ownerProfilesById = new Map((ownerProfilesData || []).map((profileRow) => [profileRow.id, profileRow]));
  const firstOwnerByCompanyId = new Map();
  const countsByCompanyId = new Map();

  function ensureCompanyCounts(companyId) {
    if (!countsByCompanyId.has(companyId)) {
      countsByCompanyId.set(companyId, {
        active_members_count: 0,
        active_staff_members_count: 0,
        manager_members_count: 0,
        detailer_members_count: 0,
        clients_count: 0,
        leads_count: 0,
        open_leads_count: 0,
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
    if (membership.is_active) {
      bucket.active_members_count += 1;
      if (membership.role === "manager") {
        bucket.active_staff_members_count += 1;
        bucket.manager_members_count += 1;
      }
      if (membership.role === "detailer") {
        bucket.active_staff_members_count += 1;
        bucket.detailer_members_count += 1;
      }
    }
  }

  for (const client of platformClientsData || []) {
    ensureCompanyCounts(client.company_id).clients_count += 1;
  }

  for (const lead of platformLeadsData || []) {
    const bucket = ensureCompanyCounts(lead.company_id);
    bucket.leads_count += 1;
    if (getLeadStageKey(lead.status) !== "done" && getLeadStageKey(lead.status) !== "lost") {
      bucket.open_leads_count += 1;
    }
  }

  for (const service of platformServicesData || []) {
    const bucket = ensureCompanyCounts(service.company_id);
    if (service.is_active !== false) bucket.services_count += 1;
  }

  const enrichedCompanies = companies.map((company) => {
    const ownerMembership = firstOwnerByCompanyId.get(company.id) || null;
    const ownerProfile = ownerMembership ? ownerProfilesById.get(ownerMembership.user_id) : null;
    const usage = countsByCompanyId.get(company.id) || {};

    return {
      ...company,
      owner_name: ownerProfile?.full_name || null,
      owner_email: ownerProfile?.email || null,
      owner_connected_at: ownerMembership?.created_at || null,
      active_members_count: usage.active_members_count || 0,
      active_staff_members_count: usage.active_staff_members_count || 0,
      manager_members_count: usage.manager_members_count || 0,
      detailer_members_count: usage.detailer_members_count || 0,
      clients_count: usage.clients_count || 0,
      leads_count: usage.leads_count || 0,
      open_leads_count: usage.open_leads_count || 0,
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

function buildQaReport({ companies, subscriptions, demoRequests }) {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const subscriptionsByCompanyId = new Map(subscriptions.map((subscription) => [subscription.company_id, subscription]));
  const latestDemoRequestByCompanyId = new Map();

  for (const request of demoRequests.slice().sort((a, b) => getComparableDate(b.created_at) - getComparableDate(a.created_at))) {
    if (request.connected_company_id && !latestDemoRequestByCompanyId.has(request.connected_company_id)) {
      latestDemoRequestByCompanyId.set(request.connected_company_id, request);
    }
  }

  const multiCompanyQaRows = companies
    .map((company) => {
      const subscription = subscriptionsByCompanyId.get(company.id) || null;
      const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
      const activation = linkedDemoRequest ? getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId) : null;
      const qaRecord = getCompanyQaRecord({ company, subscription, activation });
      const paidRecord = getPaidReadinessRecord({ company, subscription, activation });

      return {
        ...qaRecord,
        goLive: paidRecord.goLive,
        billingStatus: paidRecord.billingStatus,
        blockers: paidRecord.blockers,
        paidReady: paidRecord.paidReady,
        readiness: paidRecord.readiness,
        nextStep: paidRecord.nextStep
      };
    })
    .sort((left, right) => right.severityScore - left.severityScore || getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at));

  const paidOnboardingRows = multiCompanyQaRows
    .map((item) => ({
      company: item.company,
      subscription: item.subscription,
      activation: item.activation,
      goLive: item.goLive,
      billingStatus: item.billingStatus,
      blockers: item.blockers,
      paidReady: item.paidReady,
      readiness: item.readiness,
      nextStep: item.nextStep
    }))
    .sort((left, right) => {
      const leftRank = left.readiness === "ready_for_paid" ? 3 : left.readiness === "almost_ready" ? 2 : left.readiness === "blocked" ? 1 : 0;
      const rightRank = right.readiness === "ready_for_paid" ? 3 : right.readiness === "almost_ready" ? 2 : right.readiness === "blocked" ? 1 : 0;
      return rightRank - leftRank || left.goLive.unresolvedCount - right.goLive.unresolvedCount || getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at);
    });

  const summary = {
    total_companies: companies.length,
    real_companies: companies.filter((company) => !company.is_demo).length,
    demo_companies: companies.filter((company) => company.is_demo).length,
    critical: multiCompanyQaRows.filter((item) => item.severity === "critical").length,
    warning: multiCompanyQaRows.filter((item) => item.severity === "warning").length,
    ok: multiCompanyQaRows.filter((item) => item.severity === "ok").length,
    ready_for_paid: multiCompanyQaRows.filter((item) => item.paidReady).length,
    almost_ready: paidOnboardingRows.filter((item) => item.readiness === "almost_ready").length,
    blocked: multiCompanyQaRows.filter((item) => item.goLive.readiness === "blocked").length,
    handoff_open: multiCompanyQaRows.filter((item) => item.activation && item.activation.stage !== "ready_check").length,
    past_due: multiCompanyQaRows.filter((item) => item.billingStatus === "past_due").length,
    trial_expired: multiCompanyQaRows.filter((item) => item.billingStatus === "trial" && getDaysUntil(item.subscription?.trial_ends_at) < 0).length
  };

  const blockerSummary = {};

  for (const item of multiCompanyQaRows) {
    for (const qaItem of item.goLive.items.filter((entry) => !entry.done)) {
      const key = goLiveBlockerLabels[qaItem.key] || qaItem.key;
      blockerSummary[key] = (blockerSummary[key] || 0) + 1;
    }
  }

  const topCritical = multiCompanyQaRows
    .filter((item) => item.severity === "critical")
    .slice(0, 10)
    .map((item) => ({
      company: item.company.name,
      slug: item.company.slug,
      status: item.company.status,
      plan: planLabels[item.planCode] || item.planCode,
      billing_status: item.billingStatus,
      issues: item.issues
    }));

  const topLaunchCandidates = multiCompanyQaRows
    .filter((item) => item.paidReady || item.readiness === "almost_ready")
    .slice(0, 10)
    .map((item) => ({
      company: item.company.name,
      slug: item.company.slug,
      readiness: item.readiness,
      billing_status: item.billingStatus,
      unresolved: item.blockers.map((qaItem) => qaItem.label)
    }));

  const paidReadinessSummary = {
    ready_for_paid: paidOnboardingRows.filter((item) => item.readiness === "ready_for_paid").length,
    almost_ready: paidOnboardingRows.filter((item) => item.readiness === "almost_ready").length,
    blocked: paidOnboardingRows.filter((item) => item.readiness === "blocked").length,
    manual: paidOnboardingRows.filter((item) => item.billingStatus === "manual").length,
    trial: paidOnboardingRows.filter((item) => item.billingStatus === "trial").length,
    past_due: paidOnboardingRows.filter((item) => item.billingStatus === "past_due").length
  };

  const realPaidOnboardingRows = paidOnboardingRows.filter((item) => !item.company.is_demo);
  const realPaidReadinessSummary = {
    ready_for_paid: realPaidOnboardingRows.filter((item) => item.readiness === "ready_for_paid").length,
    almost_ready: realPaidOnboardingRows.filter((item) => item.readiness === "almost_ready").length,
    blocked: realPaidOnboardingRows.filter((item) => item.readiness === "blocked").length
  };

  const blockerQueues = {
    company_inactive: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "company_status" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({ company: item.company.name, slug: item.company.slug, status: item.company.status })),
    billing_not_paid: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "billing" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({ company: item.company.name, slug: item.company.slug, billing_status: item.billingStatus })),
    owner_missing: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "owner" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({ company: item.company.name, slug: item.company.slug })),
    team_missing: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "members" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({ company: item.company.name, slug: item.company.slug, active_members_count: item.company.active_members_count || 0 })),
    services_missing: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "services" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({ company: item.company.name, slug: item.company.slug, services_count: item.company.services_count || 0 })),
    handoff_open: multiCompanyQaRows
      .filter((item) => item.goLive.items.some((qaItem) => qaItem.key === "handoff" && !qaItem.done))
      .slice(0, 10)
      .map((item) => ({
        company: item.company.name,
        slug: item.company.slug,
        handoff_stage: item.activation ? formatActivationStage(item.activation.stage) : "—"
      }))
  };

  const paidPriorityQueue = paidOnboardingRows
    .filter((item) => item.paidReady || item.readiness === "almost_ready" || item.billingStatus === "past_due")
    .slice(0, 10)
    .map((item) => ({
      company: item.company.name,
      slug: item.company.slug,
      readiness: item.readiness,
      billing_status: item.billingStatus,
      next_step: item.nextStep,
      blockers: item.blockers.map((entry) => entry.label)
    }));

  const nextActions = paidOnboardingRows
    .filter((item) => !item.paidReady)
    .slice(0, 10)
    .map((item) => ({
      company: item.company.name,
      slug: item.company.slug,
      readiness: item.readiness,
      next_step: item.nextStep,
      blockers: item.blockers.map((entry) => entry.label)
    }));

  const strictRiskClean = summary.critical === 0 && summary.past_due === 0 && summary.handoff_open === 0 && summary.trial_expired === 0;

  return {
    generated_at: new Date().toISOString(),
    strict: strictMode,
    strict_ready: strictRiskClean,
    strict_risk_clean: strictRiskClean,
    strict_paid_ready_count: paidReadinessSummary.ready_for_paid,
    strict_real_paid_ready_count: realPaidReadinessSummary.ready_for_paid,
    summary,
    paid_readiness_summary: paidReadinessSummary,
    real_paid_readiness_summary: realPaidReadinessSummary,
    blocker_summary: blockerSummary,
    critical_companies: topCritical,
    launch_candidates: topLaunchCandidates,
    paid_priority_queue: paidPriorityQueue,
    next_actions: nextActions,
    blocker_queues: blockerQueues
  };
}

async function main() {
  const data = await loadPlatformData();
  const report = buildQaReport(data);
  console.log(JSON.stringify(report, null, 2));

  if (!strictMode) {
    return;
  }

  if (!report.strict_ready) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
