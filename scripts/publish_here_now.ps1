$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

$root = "C:\Users\Asus\Documents\New project 2\detailing-crm-mvp\dist"
$projectRoot = "C:\Users\Asus\Documents\New project 2\detailing-crm-mvp"
$slug = "swift-muse-t4q9"
$credentialsPath = "C:\Users\Asus\.herenow\credentials"
$stateDir = Join-Path $projectRoot ".herenow"
$statePath = Join-Path $stateDir "state.json"
$claimToken = ""

if (-not (Test-Path -LiteralPath $credentialsPath)) {
    throw "here.now credentials not found at $credentialsPath"
}

if (-not (Test-Path -LiteralPath $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir | Out-Null
}

$legacyStatePath = Join-Path $stateDir "state.json"
if (Test-Path -LiteralPath $legacyStatePath) {
    $legacyStateRaw = Get-Content -LiteralPath $legacyStatePath -Raw
    if ($legacyStateRaw) {
        $legacyState = $legacyStateRaw | ConvertFrom-Json
        if ($legacyState.publishes.$slug.claimToken) {
            $claimToken = [string]$legacyState.publishes.$slug.claimToken
        }
    }
}

$apiKey = (Get-Content -LiteralPath $credentialsPath -Raw).Trim()
$http = [System.Net.Http.HttpClient]::new()
$http.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $apiKey)

function Get-ContentType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "text/javascript; charset=utf-8" }
        ".xml"  { return "application/xml; charset=utf-8" }
        ".txt"  { return "text/plain; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".webp" { return "image/webp" }
        ".svg"  { return "image/svg+xml" }
        default { return "application/octet-stream" }
    }
}

function Get-Sha256([string]$path) {
    $hash = Get-FileHash -LiteralPath $path -Algorithm SHA256
    return $hash.Hash.ToLowerInvariant()
}

$allFiles = Get-ChildItem -LiteralPath $root -Recurse -File

$files = foreach ($file in $allFiles) {
    $relative = $file.FullName.Substring($root.Length + 1).Replace("\", "/")
    [ordered]@{
        path = $relative
        size = $file.Length
        contentType = Get-ContentType $file.FullName
        hash = Get-Sha256 $file.FullName
    }
}

$body = @{
    files = $files
    ttlSeconds = $null
    title = "DETAIL CRM"
    description = "Detailing CRM with leads, clients, tasks, team roles, and a public request form."
    claimToken = $claimToken
} | ConvertTo-Json -Depth 6

$publishUrl = "https://here.now/api/v1/publish/$slug"
$request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Put, $publishUrl)
$request.Content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")
$responseMessage = $http.SendAsync($request).GetAwaiter().GetResult()
$responseJson = $responseMessage.Content.ReadAsStringAsync().GetAwaiter().GetResult()

if (-not $responseMessage.IsSuccessStatusCode) {
    throw "Publish failed: $([int]$responseMessage.StatusCode) $($responseMessage.ReasonPhrase)`n$responseJson"
}

$response = $responseJson | ConvertFrom-Json
$uploadClient = [System.Net.Http.HttpClient]::new()

foreach ($upload in $response.upload.uploads) {
    $localPath = Join-Path $root ($upload.path -replace "/", "\")
    $uploadRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Put, [string]$upload.url)
    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $uploadRequest.Content = [System.Net.Http.ByteArrayContent]::new($bytes)
    $uploadRequest.Content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse([string]$upload.headers."Content-Type")

    foreach ($prop in $upload.headers.PSObject.Properties) {
        if ($prop.Name -ne "Content-Type") {
            [void]$uploadRequest.Headers.TryAddWithoutValidation($prop.Name, [string]$prop.Value)
        }
    }

    $uploadResponse = $uploadClient.SendAsync($uploadRequest).GetAwaiter().GetResult()
    $uploadResponse.EnsureSuccessStatusCode() | Out-Null
}

$finalizeBody = @{
    versionId = $response.upload.versionId
} | ConvertTo-Json

$finalizeRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, [string]$response.upload.finalizeUrl)
$finalizeRequest.Content = [System.Net.Http.StringContent]::new($finalizeBody, [System.Text.Encoding]::UTF8, "application/json")
$finalizeResponse = $http.SendAsync($finalizeRequest).GetAwaiter().GetResult()
$finalizeResponse.EnsureSuccessStatusCode() | Out-Null

$state = [ordered]@{
    slug = $slug
    siteUrl = if ($response.siteUrl) { [string]$response.siteUrl } else { "https://$slug.here.now/" }
    versionId = [string]$response.upload.versionId
    authMode = "authenticated"
    lastPublishedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding utf8

[pscustomobject]@{
    slug = $state.slug
    siteUrl = $state.siteUrl
    versionId = $state.versionId
    uploaded = $response.upload.uploads.Count
    skipped = $response.upload.skipped.Count
}
