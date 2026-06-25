import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectFiles(rootRelativePath, extensionFilter = null) {
  const rootPath = path.join(projectRoot, rootRelativePath);
  const result = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath);
        continue;
      }

      if (!extensionFilter || extensionFilter.some((extension) => nextPath.endsWith(extension))) {
        result.push(nextPath);
      }
    }
  }

  walk(rootPath);
  return result;
}

function toRelative(fullPath) {
  return path.relative(projectRoot, fullPath);
}

function assertNoPatternInFiles(files, pattern, message, failures) {
  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    if (pattern.test(text)) {
      failures.push(`${message}: ${toRelative(filePath)}`);
    }
  }
}

const failures = [];
const schemaText = read("supabase/schema.sql");
const publicFlowCheckText = read("scripts/public-flow-check.mjs");
const platformPaidCloseText = read("scripts/platform-paid-close.mjs");
const publicRequestFunctionText = read("supabase/functions/public-request/index.ts");
const demoRequestFunctionText = read("supabase/functions/demo-request/index.ts");
const leadAlertFunctionText = read("supabase/functions/lead-alert/index.ts");
const followUpReminderFunctionText = read("supabase/functions/follow-up-reminder/index.ts");
const dailyDigestFunctionText = read("supabase/functions/daily-digest/index.ts");

const runtimeFiles = [
  ...collectFiles("src", [".js", ".jsx", ".ts", ".tsx"]),
  ...collectFiles("scripts", [".js", ".mjs", ".ts"]),
  ...collectFiles("supabase/functions", [".js", ".ts"])
].filter((filePath) => toRelative(filePath) !== "scripts/hardening-audit.mjs");

assertNoPatternInFiles(
  runtimeFiles,
  /\bprofiles\.role\b/g,
  "Legacy profiles.role reference still exists in runtime code",
  failures
);

if (/submit_public_lead_rpc/.test(publicFlowCheckText) || /\.rpc\("submit_public_lead"/.test(publicFlowCheckText)) {
  failures.push("public-flow-check still bypasses the real edge flow through submit_public_lead RPC fallback");
}

if (!/company\.is_demo/.test(platformPaidCloseText)) {
  failures.push("platform-paid-close no longer checks company.is_demo when picking the first paid-close target");
}

if (/grant execute on function public\.default_company_id_by_slug\(text\) to authenticated;/i.test(schemaText)) {
  failures.push("schema still grants authenticated execute on default_company_id_by_slug(text)");
}

if (/grant execute on function public\.submit_public_lead\([^)]*\)\s*to authenticated;/i.test(schemaText)) {
  failures.push("schema still grants authenticated execute on submit_public_lead(...)");
}

if (!/grant execute on function public\.default_company_id_by_slug\(text\) to anon;/i.test(schemaText)) {
  failures.push("schema no longer grants anon execute on default_company_id_by_slug(text)");
}

if (!/grant execute on function public\.submit_public_lead\([^)]*\)\s*to anon;/i.test(schemaText)) {
  failures.push("schema no longer grants anon execute on submit_public_lead(...)");
}

if (/Access-Control-Allow-Origin": "\*"/.test(publicRequestFunctionText) || /TODO: replace "\*" with the production app domain/.test(publicRequestFunctionText)) {
  failures.push("public-request still uses wildcard CORS instead of explicit origin control");
}

if (/Access-Control-Allow-Origin": "\*"/.test(demoRequestFunctionText)) {
  failures.push("demo-request still uses wildcard CORS instead of explicit origin control");
}

if (!/buildCorsHeaders/.test(publicRequestFunctionText) || !/buildCorsHeaders/.test(demoRequestFunctionText)) {
  failures.push("public edge functions no longer use shared CORS hardening helper");
}

for (const [label, text] of [
  ["lead-alert", leadAlertFunctionText],
  ["follow-up-reminder", followUpReminderFunctionText],
  ["daily-digest", dailyDigestFunctionText]
]) {
  if (!/requireInternalToken\(request\)/.test(text)) {
    failures.push(`${label} no longer requires a strict internal token gate`);
  }

  if (/if \(internalToken\)/.test(text)) {
    failures.push(`${label} still treats ALERT_INTERNAL_TOKEN as optional`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        runtime_files: runtimeFiles.length,
        public_flow_edge_only: true,
        paid_close_demo_guard: true,
        helper_grants_hardened: true,
        public_cors_hardened: true,
        internal_alert_gate_hardened: true
      }
    },
    null,
    2
  )
);
