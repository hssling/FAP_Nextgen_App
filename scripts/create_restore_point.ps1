param(
    [string]$Label = "restore-point"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeLabel = ($Label -replace "[^a-zA-Z0-9-_]", "-").ToLower()

$branchName = "backup/$safeLabel-$timestamp"
$tagName = "restore/$safeLabel-$timestamp"

git branch $branchName | Out-Null
git tag -a $tagName -m "Restore point: $Label ($timestamp)"

Write-Host "Created branch: $branchName"
Write-Host "Created tag: $tagName"
