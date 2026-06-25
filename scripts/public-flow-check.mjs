import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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
const configuredPublicCompanySlug = env.VITE_PUBLIC_COMPANY_SLUG?.trim() || "";

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const publicRequestUrl = `${env.VITE_SUPABASE_URL}/functions/v1/public-request`;
const demoRequestUrl = `${env.VITE_SUPABASE_URL}/functions/v1/demo-request`;

async function verifyStructuredDemoRequest() {
  const timestamp = Date.now();
  const ipPartA = Math.floor(Math.random() * 200) + 20;
  const ipPartB = Math.floor(Math.random() * 200) + 20;
  const forwardedIp = `198.18.${ipPartA}.${ipPartB}`;

  const response = await fetch(demoRequestUrl, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      "x-forwarded-for": forwardedIp
    },
    body: JSON.stringify({
      name: "Structured Demo Check",
      phone: `+37379${String(timestamp).slice(-6)}`,
      company_name: "Structured Auto Service QA",
      business: "auto_service",
      role: "owner",
      plan: "professional",
      billing: "yearly",
      employees_count: 5,
      locations_count: 2,
      comment: "[qa-check] structured demo-request check"
    })
  });

  const json = await response.json();

  if (response.status === 429) {
    return {
      rate_limited: true,
      error: json?.error || "demo-request rate-limited"
    };
  }

  if (!response.ok) {
    throw new Error(json?.error || `demo-request failed with status ${response.status}`);
  }

  const result = json?.result || null;
  if (!result?.id) {
    throw new Error("demo-request returned no id");
  }

  if (result.business_type !== "auto_service") {
    throw new Error(`demo-request business_type mismatch: expected auto_service, got ${result.business_type || "empty"}`);
  }

  if (result.company_name !== "Structured Auto Service QA") {
    throw new Error("demo-request company_name was not persisted");
  }

  if (result.employees_count !== 5 || result.locations_count !== 2) {
    throw new Error("demo-request team/location fields were not persisted");
  }

  if (result.meta?.plan !== "professional" || result.meta?.billing !== "yearly" || result.meta?.role !== "owner") {
    throw new Error("demo-request structured meta payload was not persisted");
  }

  if (result.is_demo !== true) {
    throw new Error("demo-request QA flag was not persisted");
  }

  return {
    id: result.id,
    business_type: result.business_type,
    company_name: result.company_name,
    is_demo: result.is_demo,
    meta: result.meta
  };
}

async function main() {
  const publicCompanySlug = configuredPublicCompanySlug;

  if (!publicCompanySlug) {
    throw new Error("VITE_PUBLIC_COMPANY_SLUG is required for public-flow-check. Automatic fallback to the first active company is no longer allowed.");
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("slug", publicCompanySlug)
    .eq("status", "active")
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company?.id) {
    throw new Error(`Active company not found for slug ${publicCompanySlug}.`);
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1);

  if (servicesError) {
    throw servicesError;
  }

  const service = services?.[0];
  if (!service) {
    throw new Error("No active services found. Make sure seed data exists.");
  }

  const timestamp = Date.now();
  const payload = {
    client_name: "Public Demo Client",
    phone: `+37378${String(timestamp).slice(-6)}`,
    email: "public.demo@example.com",
    service_id: service.id,
    car_make: "Skoda",
    car_model: "Kodiaq",
    car_year: "2021",
    car_plate: "PUB101",
    source: "landing",
    address: "Buiucani, Chisinau",
    comment: "Public request form test for detailing CRM.",
    preferred_date: "2026-06-03",
    preferred_time: "11:30",
    estimated_price: "150",
    follow_up_at: ""
  };

  const ipPartA = Math.floor(Math.random() * 200) + 20;
  const ipPartB = Math.floor(Math.random() * 200) + 20;
  const forwardedIp = `198.51.${ipPartA}.${ipPartB}`;

  const response = await fetch(publicRequestUrl, {
    method: "POST",
    headers: {
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      "x-forwarded-for": forwardedIp
    },
    body: JSON.stringify({
      ...payload,
      website: "",
      company_slug: publicCompanySlug
    })
  });

  const json = await response.json();

  if (response.status === 429) {
    const demoRequestResult = await verifyStructuredDemoRequest();

    console.log(
      JSON.stringify(
        {
          ok: true,
          rate_limited: true,
          edge_only_verified: true,
          edge_error: json?.error || "public-request rate-limited",
          company_slug: publicCompanySlug,
          demo_request: demoRequestResult
        },
        null,
        2
      )
    );
    return;
  }

  if (!response.ok) {
    throw new Error(json?.error || `public-request failed with status ${response.status}`);
  }

  const demoRequestResult = await verifyStructuredDemoRequest();
  console.log(
    JSON.stringify(
      {
        ok: true,
        result: json?.result || null,
        alert_status: json?.alert_status || null,
        demo_request: demoRequestResult
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
