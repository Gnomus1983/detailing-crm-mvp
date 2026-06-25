import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
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

function loadEnvText() {
  const envPath = resolveEnvPath();
  if (!envPath || !fs.existsSync(envPath)) {
    return "";
  }

  return fs.readFileSync(envPath, "utf8");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? loadEnvValue("VITE_SUPABASE_URL");
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? loadEnvValue("VITE_SUPABASE_PUBLISHABLE_KEY");
const configuredPublicCompanySlug = process.env.VITE_PUBLIC_COMPANY_SLUG ?? loadEnvValue("VITE_PUBLIC_COMPANY_SLUG") ?? "";
const publicRequestUrl = `${supabaseUrl}/functions/v1/public-request`;
const testEmail = process.env.VITE_TEST_EMAIL ?? loadEnvValue("VITE_TEST_EMAIL");
const testPassword = process.env.VITE_TEST_PASSWORD ?? loadEnvValue("VITE_TEST_PASSWORD");
const envText = loadEnvText();
const managerEmail = process.env.MANAGER_TEST_EMAIL ?? loadEnvValue("MANAGER_TEST_EMAIL");
const managerPassword = process.env.MANAGER_TEST_PASSWORD ?? loadEnvValue("MANAGER_TEST_PASSWORD");
const ownerEmail = process.env.OWNER_TEST_EMAIL ?? loadEnvValue("OWNER_TEST_EMAIL");
const ownerPassword = process.env.OWNER_TEST_PASSWORD ?? loadEnvValue("OWNER_TEST_PASSWORD");
const creatorEmail = process.env.CREATOR_TEST_EMAIL ?? loadEnvValue("CREATOR_TEST_EMAIL");
const creatorPassword = process.env.CREATOR_TEST_PASSWORD ?? loadEnvValue("CREATOR_TEST_PASSWORD");
const helperSupabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

function parseKnownStatusToken() {
  const tokenMatch = envText.match(/STATUS_TEST_TOKEN=(.+)/);
  return tokenMatch?.[1]?.trim() || "";
}

const statusTestToken = parseKnownStatusToken();
let resolvedPublicCompanySlugPromise: Promise<string> | null = null;

async function resolvePublicCompanySlug() {
  if (configuredPublicCompanySlug) {
    return configuredPublicCompanySlug;
  }

  if (!helperSupabase) {
    return "";
  }

  if (!resolvedPublicCompanySlugPromise) {
    resolvedPublicCompanySlugPromise = helperSupabase
      .from("companies")
      .select("slug, is_demo")
      .eq("status", "active")
      .order("is_demo", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        return data?.[0]?.slug || "";
      });
  }

  return resolvedPublicCompanySlugPromise;
}

test("public request form opens", async ({ page }) => {
  await page.goto("/request");
  await expect(page.getByText("Шаг 1 из 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Далее" })).toBeVisible();
});

test("marketing routes open without crashing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CRM для детейлинга, автомоек и автостудий" })).toBeVisible();

  await page.goto("/features");
  await expect(page.getByRole("heading", { name: "Каталог детейлинг-центров, автомоек и автосервисов" })).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Тарифы для каталога, команды и подключений" })).toBeVisible();

  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Как каталог + CRM работают для автоуслуг" })).toBeVisible();
});

test("public request validation works", async ({ page }) => {
  await page.goto("/request");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByText("Сначала выберите услугу.")).toBeVisible();
});

test("auth page opens", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('form button[type="submit"]')).toBeVisible();
});

test("company login page shows company context", async ({ page }) => {
  const publicCompanySlug = await resolvePublicCompanySlug();
  test.skip(!publicCompanySlug, "Set VITE_PUBLIC_COMPANY_SLUG or keep at least one active company for company login smoke test.");

  await page.goto(`/login?company_slug=${publicCompanySlug}`);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator(".auth-company-badge")).toBeVisible();
});

test("dashboard is available after login", async ({ page }) => {
  test.skip(!testEmail || !testPassword, "Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD to enable the login smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(testEmail!);
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.locator(".crm-summary-bar")).toBeVisible();
});

test("lead card opens without crashing the page", async ({ page }) => {
  test.skip(!testEmail || !testPassword, "Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD to enable the lead smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(testEmail!);
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.getByRole("link", { name: "Заявки", exact: true }).click();
  await expect(page).toHaveURL(/\/leads$/);
  const firstLeadCard = page.locator(".lead-kanban-card").first();

  if ((await page.locator(".lead-kanban-card").count()) === 0) {
    return;
  }

  await expect(firstLeadCard).toBeVisible();
  await firstLeadCard.click();

  await expect(page.locator(".detail-card")).toBeVisible();
  await expect(page.getByText("Карточка заявки")).toBeVisible();
});

test("manager is redirected away from settings page", async ({ page }) => {
  test.skip(!managerEmail || !managerPassword, "Set MANAGER_TEST_EMAIL and MANAGER_TEST_PASSWORD to enable manager routing smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(managerEmail!);
  await page.locator('input[type="password"]').fill(managerPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.goto("/settings");

  await expect(page).not.toHaveURL(/\/settings$/);
});

test("manager can update lead status and assign detailer", async ({ page }) => {
  test.skip(!managerEmail || !managerPassword, "Set MANAGER_TEST_EMAIL and MANAGER_TEST_PASSWORD to enable manager lead actions smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(managerEmail!);
  await page.locator('input[type="password"]').fill(managerPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.goto("/leads");

  const firstLeadCard = page.locator(".lead-kanban-card").first();
  if ((await page.locator(".lead-kanban-card").count()) === 0) {
    return;
  }
  await expect(firstLeadCard).toBeVisible();
  await firstLeadCard.click();
  const detailCard = page.locator(".detail-card");
  await expect(detailCard).toBeVisible();

  const activeStatusChip = detailCard.locator(".status-chip-row .status-chip.active").first();
  const activeStatusText = ((await activeStatusChip.textContent()) || "").toLowerCase();
  const targetStatusPattern =
    activeStatusText.includes("работе")
      ? /диагност/i
      : /работе/i;
  const targetStatusButton = detailCard.locator(".status-chip-row .status-chip", { hasText: targetStatusPattern }).first();
  await targetStatusButton.click();
  await expect(page.locator(".notice-success")).toContainText("Статус обновлён");

  const assigneeCard = detailCard.locator(".detail-card-item.block").filter({ has: page.getByText("Назначение мастера") }).first();
  const assigneeSelect = assigneeCard.locator("select");
  const options = assigneeSelect.locator("option");
  await expect(options).toHaveCount(2);
  await expect(options.nth(1)).not.toHaveText(/^Мастер$/);
  const nextAssignee = await options.nth(1).getAttribute("value");
  test.skip(!nextAssignee, "No detailer option found for manager assignee smoke test.");

  await assigneeSelect.selectOption(nextAssignee!);
  await assigneeCard.getByRole("button", { name: "Сохранить мастера" }).click();
  await expect(page.locator(".notice-success")).toContainText("Мастер назначен");
});

test("company switch does not leak previous company state", async ({ page }) => {
  test.skip(!testEmail || !testPassword, "Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD to enable company switch smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(testEmail!);
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);

  const companySwitch = page.locator(".topbar-company-switch select");
  if ((await companySwitch.count()) === 0) {
    return;
  }

  const options = companySwitch.locator("option");
  if ((await options.count()) < 2) {
    return;
  }

  const firstLabel = ((await options.nth(0).textContent()) || "").trim();
  const secondValue = await options.nth(1).getAttribute("value");
  const secondLabel = ((await options.nth(1).textContent()) || "").trim();
  test.skip(!secondValue, "Second company option is missing.");

  await companySwitch.selectOption(secondValue!);
  await expect(page.locator(".notice-success")).toContainText(secondLabel);
  await expect(page.locator(".topbar-company-switch select")).toHaveValue(secondValue!);

  await page.goto("/leads");
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.locator(".topbar-company-switch select")).toHaveValue(secondValue!);
  await expect(page.locator(".topbar-company-switch")).not.toContainText(firstLabel);
});

test("settings page opens for owner", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Set OWNER_TEST_EMAIL and OWNER_TEST_PASSWORD to enable the owner settings smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ownerEmail!);
  await page.locator('input[type="password"]').fill(ownerPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Профиль", exact: true })).toBeVisible();
});

test("creator can click 'Открыть CRM' from landing and return to platform", async ({ page }) => {
  test.skip(!creatorEmail || !creatorPassword, "Set CREATOR_TEST_EMAIL and CREATOR_TEST_PASSWORD to enable creator routing smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(creatorEmail!);
  await page.locator('input[type="password"]').fill(creatorPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", { name: "Панель создателя" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Что происходит с выручкой и подключениями" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Открыть CRM" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Открыть CRM" }).first().click();

  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", { name: "Панель создателя" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Что происходит с выручкой и подключениями" })).toBeVisible();
});

test("owner is redirected away from platform page", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Set OWNER_TEST_EMAIL and OWNER_TEST_PASSWORD to enable platform isolation smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ownerEmail!);
  await page.locator('input[type="password"]').fill(ownerPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.goto("/platform");

  await expect(page).not.toHaveURL(/\/platform$/);
  await expect(page.locator(".topbar")).toBeVisible();
});

test("public status page opens by token", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Set OWNER_TEST_EMAIL and OWNER_TEST_PASSWORD to enable public status smoke test.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ownerEmail!);
  await page.locator('input[type="password"]').fill(ownerPassword!);
  await page.locator('input[type="password"]').press("Enter");

  await expect(page).toHaveURL(/dashboard|leads|clients|tasks|settings/);
  await page.goto("/leads");

  const firstLeadCard = page.locator(".lead-kanban-card").first();
  if ((await page.locator(".lead-kanban-card").count()) === 0) {
    return;
  }
  await expect(firstLeadCard).toBeVisible();
  await firstLeadCard.click();

  const statusUrlInput = page.locator(".public-status-link-row input[readonly]").first();
  const statusUrl = await statusUrlInput.inputValue();
  const path = new URL(statusUrl).pathname;

  await page.goto(path);
  await expect(page.locator(".public-status-hero .eyebrow")).toHaveText("Статус заявки");
  await expect(page.locator(".public-status-summary-grid")).toBeVisible();
  await expect(page.getByText("Текущий этап")).toBeVisible();
});

test("public endpoint keeps rate limiting active", async () => {
  test.skip(!supabaseUrl || !supabaseAnonKey, "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable public endpoint smoke tests.");
  const publicCompanySlug = await resolvePublicCompanySlug();
  test.skip(!publicCompanySlug, "Set VITE_PUBLIC_COMPANY_SLUG or keep at least one active company for public endpoint smoke tests.");

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
      website: "",
      company_slug: publicCompanySlug
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
  expect(rateLimitBody).toContain("слишком много заявок");
});
