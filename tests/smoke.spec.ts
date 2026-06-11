import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

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

function loadEnvValue(key: string) {
  const envPath = resolveEnvPath();
  if (!envPath || !fs.existsSync(envPath)) {
    return undefined;
  }

  const file = fs.readFileSync(envPath, "utf8");
  const line = file
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return undefined;
  }

  const separatorIndex = line.indexOf("=");
  if (separatorIndex === -1) {
    return undefined;
  }

  return line.slice(separatorIndex + 1).trim();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? loadEnvValue("VITE_SUPABASE_URL");
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? loadEnvValue("VITE_SUPABASE_PUBLISHABLE_KEY");
const publicRequestUrl = `${supabaseUrl}/functions/v1/public-request`;
const testEmail = process.env.VITE_TEST_EMAIL ?? loadEnvValue("VITE_TEST_EMAIL");
const testPassword = process.env.VITE_TEST_PASSWORD ?? loadEnvValue("VITE_TEST_PASSWORD");

test("public request form opens", async ({ page }) => {
  await page.goto("/request");
  await expect(page.locator('form input[name="client_name"]')).toBeVisible();
  await expect(page.locator('form button[type="submit"]')).toBeVisible();
});

test("public request validation works", async ({ page }) => {
  await page.goto("/request");

  const nameInput = page.locator('input[name="client_name"]');
  await page.locator('form button[type="submit"]').click();

  const validationMessage = await nameInput.evaluate((element) => (element as HTMLInputElement).validationMessage);
  expect(validationMessage.length).toBeGreaterThan(0);
});

test("auth page opens", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('form button[type="submit"]')).toBeVisible();
});

test("dashboard is available after login", async ({ page }) => {
  test.skip(!testEmail || !testPassword, "Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD to enable the login smoke test.");

  await page.goto("/");
  await page.locator('input[type="email"]').fill(testEmail!);
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await expect(page.getByText("DETAIL CRM")).toBeVisible();
});

test("public endpoint keeps rate limiting active", async () => {
  test.skip(!supabaseUrl || !supabaseAnonKey, "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable public endpoint smoke tests.");

  const ipSuffix = Math.floor(Math.random() * 200) + 20;
  const forwardedIp = `203.0.113.${ipSuffix}`;
  const statuses: number[] = [];
  let rateLimitBody = "";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const payload = {
      client_name: `Rate Limit Smoke ${attempt}`,
      phone: `+37379${Date.now().toString().slice(-5)}${attempt}`,
      email: `rate-limit-${attempt}@gmail.com`,
      service_id: null,
      car_make: "BMW",
      car_model: "X5",
      car_year: 2022,
      car_plate: "",
      source: "landing",
      address: "",
      comment: "Smoke rate limit test",
      preferred_date: null,
      preferred_time: "",
      estimated_price: "",
      follow_up_at: null,
      website: ""
    };

    const response = await fetch(publicRequestUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
        "Content-Type": "application/json",
        "x-forwarded-for": forwardedIp
      },
      body: JSON.stringify(payload)
    });
    statuses.push(response.status);

    if (response.status === 429) {
      const body = await response.json();
      rateLimitBody = body.error || "";
      break;
    }
  }

  expect(statuses.length).toBeGreaterThan(0);
  expect(statuses).toContain(429);
  expect(rateLimitBody).toContain("prea multe cereri");
});
