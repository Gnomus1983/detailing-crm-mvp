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

function slugifyCompanyName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildStarterCredentials(company, role) {
  const baseSlug = slugifyCompanyName(company?.slug || company?.name || "company");
  const suffix = Date.now().toString().slice(-6);
  const roleAlias = role === "owner" ? "owner" : role === "manager" ? "manager" : "master";
  const roleLabel = role === "owner" ? "Owner" : role === "manager" ? "Manager" : "Master";

  return {
    role,
    full_name: `${company?.name || "Company"} ${roleLabel}`.trim(),
    email: `${baseSlug}.${roleAlias}.${suffix}@detailcrm.app`,
    password: `DetailCRM26!${suffix}`
  };
}

function plusDaysIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const creatorEmail = env.CREATOR_TEST_EMAIL;
const creatorPassword = env.CREATOR_TEST_PASSWORD;
const configuredPaidCloseSlugs = String(env.PLATFORM_PAID_CLOSE_SLUGS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowDemoPaidClose = String(env.ALLOW_DEMO_PAID_CLOSE || "")
  .trim()
  .toLowerCase() === "true";

if (!supabaseUrl || !supabaseAnonKey || !creatorEmail || !creatorPassword) {
  throw new Error("Missing Supabase URL/key or creator test credentials.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const inviteClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function signInCreator() {
  const { error } = await supabase.auth.signInWithPassword({
    email: creatorEmail,
    password: creatorPassword
  });

  if (error) throw error;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData?.user?.id) throw new Error("Creator auth failed.");
  return userData.user;
}

async function loadState() {
  const [
    { data: companies, error: companiesError },
    { data: subscriptions, error: subscriptionsError },
    { data: members, error: membersError },
    { data: services, error: servicesError }
  ] = await Promise.all([
    supabase.from("companies").select("id, name, slug, status, is_demo, plan_code, business_type, contact_email, contact_phone"),
    supabase.from("company_subscriptions").select("*"),
    supabase.from("company_members").select("id, company_id, user_id, role, is_active"),
    supabase.from("services").select("id, company_id, is_active")
  ]);

  if (companiesError) throw companiesError;
  if (subscriptionsError) throw subscriptionsError;
  if (membersError) throw membersError;
  if (servicesError) throw servicesError;

  return {
    companies: companies || [],
    subscriptions: subscriptions || [],
    members: members || [],
    services: services || []
  };
}

function buildTargetCompanySlugs(state) {
  if (configuredPaidCloseSlugs.length) {
    return configuredPaidCloseSlugs;
  }

  const realCompanies = state.companies
    .filter((company) => company.is_demo !== true)
    .map((company) => company.slug)
    .filter(Boolean);

  if (realCompanies.length) {
    return realCompanies;
  }

  if (!allowDemoPaidClose) {
    throw new Error("No real companies found for platform:paid-close. Set PLATFORM_PAID_CLOSE_SLUGS explicitly or ALLOW_DEMO_PAID_CLOSE=true for demo-only runs.");
  }

  return state.companies
    .filter((company) => company.is_demo === true)
    .map((company) => company.slug)
    .filter(Boolean);
}

async function ensureSubscription(company, currentSubscription, creatorUserId, mode = "manual") {
  const now = new Date().toISOString();
  const payload = {
    company_id: company.id,
    plan_code: currentSubscription?.plan_code || company.plan_code || "starter",
    billing_status: mode === "manual" ? "manual" : "active",
    price_monthly: currentSubscription?.price_monthly ?? 0,
    starts_at: currentSubscription?.starts_at || now,
    trial_ends_at: mode === "manual" ? null : currentSubscription?.trial_ends_at || null,
    renews_at: currentSubscription?.renews_at || plusDaysIso(30),
    ends_at: currentSubscription?.ends_at || plusDaysIso(45),
    notes: [currentSubscription?.notes || "", "Creator script: paid-close normalized"].filter(Boolean).join(" | ")
  };

  const { data: updatedSubscription, error: subscriptionError } = await supabase
    .from("company_subscriptions")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  const eventType = payload.billing_status === "manual" ? "manual_prepared" : "billing_changed";
  const eventNote =
    payload.billing_status === "manual"
      ? "Creator script prepared manual billing for first paid close."
      : "Creator script activated billing for first paid close.";

  const { error: eventError } = await supabase.from("company_subscription_events").insert({
    company_id: company.id,
    subscription_id: updatedSubscription.id,
    event_type: eventType,
    note: eventNote,
    payload: {
      billing_status: updatedSubscription.billing_status,
      plan_code: updatedSubscription.plan_code,
      source: "platform-paid-close"
    },
    created_by: creatorUserId
  });

  if (eventError) throw eventError;

  return updatedSubscription;
}

async function ensureCompanyActive(company) {
  if (company.status === "active") return company;

  const { data, error } = await supabase
    .from("companies")
    .update({ status: "active" })
    .eq("id", company.id)
    .select("id, name, slug, status, plan_code, business_type, contact_email, contact_phone")
    .maybeSingle();

  if (error) throw error;
  return data || { ...company, status: "active" };
}

async function ensureRoleMember(company, members, role) {
  const existing = members.find((member) => member.company_id === company.id && member.role === role && member.is_active !== false);
  if (existing) return { created: false, member: existing };

  const credentials = buildStarterCredentials(company, role);
  const { data: signUpData, error: signUpError } = await inviteClient.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name
      }
    }
  });

  if (signUpError) throw signUpError;

  const nextUserId = signUpData.user?.id;
  if (!nextUserId) throw new Error(`Could not create ${role} user for ${company.name}.`);

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .upsert(
      {
        company_id: company.id,
        user_id: nextUserId,
        role,
        is_active: true
      },
      { onConflict: "company_id,user_id" }
    )
    .select("id, company_id, user_id, role, is_active")
    .maybeSingle();

  if (membershipError) throw membershipError;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: nextUserId,
    email: credentials.email,
    full_name: credentials.full_name
  });

  if (profileError) throw profileError;

  return { created: true, member: membership, credentials };
}

async function closeCompany(companySlug, options, state, creatorUserId) {
  const company = state.companies.find((item) => item.slug === companySlug);
  if (!company) {
    throw new Error(`Company not found: ${companySlug}`);
  }

  let nextCompany = await ensureCompanyActive(company);
  const currentSubscription = state.subscriptions.find((item) => item.company_id === company.id) || null;
  const nextSubscription = await ensureSubscription(nextCompany, currentSubscription, creatorUserId, options.billingMode || "manual");

  const createdRoles = [];
  for (const role of options.ensureRoles || []) {
    const ensured = await ensureRoleMember(nextCompany, state.members, role);
    if (ensured.created) {
      state.members.push(ensured.member);
      createdRoles.push({
        role,
        email: ensured.credentials.email,
        password: ensured.credentials.password
      });
    }
  }

  return {
    company: nextCompany.name,
    slug: nextCompany.slug,
    billing_status: nextSubscription.billing_status,
    created_roles: createdRoles
  };
}

async function main() {
  const creator = await signInCreator();
  const state = await loadState();
  const results = [];
  const targetSlugs = buildTargetCompanySlugs(state);

  for (const slug of targetSlugs) {
    const company = state.companies.find((item) => item.slug === slug);
    if (!company) {
      throw new Error(`Company not found for paid-close target: ${slug}`);
    }

    results.push(
      await closeCompany(
        slug,
        {
          billingMode: "manual",
          ensureRoles: company.is_demo ? ["manager", "detailer"] : []
        },
        state,
        creator.id
      )
    );
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
});
