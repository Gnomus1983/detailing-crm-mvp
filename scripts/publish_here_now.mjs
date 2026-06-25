import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const slug = process.env.HERENOW_SITE_SLUG || "";
const credentialsPath = process.env.HERENOW_CREDENTIALS_PATH || path.join(os.homedir(), ".herenow", "credentials");
const stateDir = path.join(projectRoot, ".herenow");
const statePath = path.join(stateDir, "state.json");

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, absolutePath)));
      continue;
    }

    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    const stat = await fs.stat(absolutePath);
    files.push({
      absolutePath,
      path: relativePath,
      size: stat.size,
      contentType: contentTypeFor(absolutePath),
      hash: await sha256(absolutePath),
    });
  }

  return files;
}

async function readCredentials() {
  const raw = await fs.readFile(credentialsPath, "utf8");
  return raw.trim();
}

async function readClaimToken() {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.publishes?.[slug]?.claimToken || parsed?.claimToken || "";
  } catch {
    return "";
  }
}

async function writeState(nextState) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(nextState, null, 2));
}

async function uploadFile(upload, allFiles) {
  const local = allFiles.find((file) => file.path === upload.path);
  if (!local) {
    throw new Error(`Missing local file for upload path: ${upload.path}`);
  }

  const buffer = await fs.readFile(local.absolutePath);
  const headers = new Headers(upload.headers || {});
  const response = await fetch(upload.url, {
    method: upload.method || "PUT",
    headers,
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${upload.path}: ${response.status} ${response.statusText}\n${text}`);
  }
}

async function startPublish(apiKey, body) {
  const targetSlug = slug.trim();
  const url = targetSlug
    ? `https://here.now/api/v1/publish/${targetSlug}`
    : "https://here.now/api/v1/publish";

  const response = await fetch(url, {
    method: targetSlug ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-HereNow-Client": "codex/publish-script",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    json,
    text,
    targetSlug,
  };
}

async function main() {
  const apiKey = await readCredentials();
  const files = await collectFiles(distRoot);
  const claimToken = await readClaimToken();

  const body = {
    files: files.map(({ path: filePath, size, contentType, hash }) => ({
      path: filePath,
      size,
      contentType,
      hash,
    })),
    ttlSeconds: null,
    spaMode: true,
    viewer: {
      title: "DETAIL CRM",
      description: "Detailing CRM with leads, clients, tasks, team roles, and a public request form.",
    },
  };

  if (claimToken && slug.trim()) {
    body.claimToken = claimToken;
  }

  let publishResult = await startPublish(apiKey, body);

  const shouldFallbackToCreate =
    slug.trim() &&
    !publishResult.ok &&
    (publishResult.status === 401 || publishResult.status === 403);

  if (shouldFallbackToCreate) {
    delete body.claimToken;
    publishResult = await startPublish(apiKey, body);
  }

  if (!publishResult.ok || !publishResult.json) {
    throw new Error(
      `Publish failed: ${publishResult.status} ${publishResult.statusText}\n${publishResult.text}`,
    );
  }

  const publishJson = publishResult.json;
  const uploads = publishJson?.upload?.uploads || [];

  for (const upload of uploads) {
    await uploadFile(upload, files);
  }

  const finalizeResponse = await fetch(publishJson.upload.finalizeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-HereNow-Client": "codex/publish-script",
    },
    body: JSON.stringify({
      versionId: publishJson.upload.versionId,
    }),
  });

  if (!finalizeResponse.ok) {
    const text = await finalizeResponse.text();
    throw new Error(`Finalize failed: ${finalizeResponse.status} ${finalizeResponse.statusText}\n${text}`);
  }

  const finalized = await finalizeResponse.json();
  const finalSlug = publishJson.slug || finalized.slug || slug.trim();
  const finalSiteUrl =
    publishJson.siteUrl || finalized.siteUrl || (finalSlug ? `https://${finalSlug}.here.now/` : "");

  await writeState({
    slug: finalSlug,
    siteUrl: finalSiteUrl,
    versionId: publishJson.upload.versionId,
    authMode: "authenticated",
    lastPublishedAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({
    slug: finalSlug,
    siteUrl: finalSiteUrl,
    versionId: publishJson.upload.versionId,
    uploaded: uploads.length,
    skipped: (publishJson?.upload?.skipped || []).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
