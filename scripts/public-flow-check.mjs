import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { submitPublicLead } from "../src/crm.js";

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

async function main() {
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("*")
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

  const result = await submitPublicLead(supabase, payload);
  console.log(JSON.stringify({ ok: true, result }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
