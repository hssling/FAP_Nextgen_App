param(
    [string]$Label = "db-backup",
    [string]$OutputDir = "_backups"
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_DB_URL) {
    throw "SUPABASE_DB_URL is not set. Set it first and retry."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeLabel = ($Label -replace "[^a-zA-Z0-9-_]", "-").ToLower()
$outFile = Join-Path $OutputDir "$safeLabel-$timestamp.dump"

pg_dump --format=custom --no-owner --no-privileges --dbname="$env:SUPABASE_DB_URL" --file="$outFile"

Write-Host "Backup created: $outFile"
