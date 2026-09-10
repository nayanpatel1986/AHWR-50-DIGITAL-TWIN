param(
    [string]$OutputDir = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'AHWR-50-Twin-Offline')
)

$ErrorActionPreference = 'Stop'

$ProjectName = 'ahwr-50-twin'
$BackendVolume = 'ahwr-50-twin_backend_data'
$InfluxVolume = 'ahwr-50-twin_influxdb_data'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$AppDir = Join-Path $OutputDir 'app'
$ImagesDir = Join-Path $OutputDir 'images'
$VolumesDir = Join-Path $OutputDir 'volumes'
$InstallerSource = Join-Path $ScriptDir 'INSTALL_AHWR_OFFLINE.ps1'
$InstallerDest = Join-Path $OutputDir 'INSTALL_AHWR_OFFLINE.ps1'
$ImageTar = Join-Path $ImagesDir 'ahwr-images.tar'

function Write-Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Run-Exe {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkDir
    )

    if ($WorkDir) { Push-Location $WorkDir }
    try {
        & $File @Arguments
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            throw "$File exited with code $code"
        }
    } finally {
        if ($WorkDir) { Pop-Location }
    }
}

function Backup-Volume {
    param(
        [string]$Name,
        [string]$ArchiveName
    )

    & docker volume inspect $Name *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker volume not found: $Name. Start the stack once before making the offline package."
    }

    Run-Exe docker @(
        'run', '--rm',
        '-v', "${Name}:/from:ro",
        '-v', "${VolumesDir}:/backup",
        'alpine:3.20',
        'sh', '-c', "cd /from && tar czf /backup/$ArchiveName ."
    )
}

if (!(Test-Path (Join-Path $RepoRoot 'docker-compose.yml'))) {
    throw "Run this script from the AHWR-50-Twin repository. Missing docker-compose.yml."
}
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or not in PATH."
}
if (!(Get-Command robocopy -ErrorAction SilentlyContinue)) {
    throw "robocopy is required on Windows."
}

Write-Step "Preparing output folder"
New-Item -ItemType Directory -Force -Path $OutputDir, $ImagesDir, $VolumesDir | Out-Null

Write-Step "Checking Docker"
Run-Exe docker @('version')

Write-Step "Building current frontend/backend/BOP collector images"
Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'build', 'backend', 'frontend', 'bop-collector') $RepoRoot

Write-Step "Ensuring helper image is available"
Run-Exe docker @('pull', 'alpine:3.20')

Write-Step "Stopping stack temporarily for a clean data copy"
Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'stop') $RepoRoot

try {
    Write-Step "Copying application files without central folder"
    $excludeDirs = @(
        '.git',
        'node_modules',
        'central',
        'backend\node_modules',
        'frontend\node_modules',
        'mock\node_modules',
        'ldap-test\node_modules',
        'etp-sink\node_modules',
        'sync-sink\node_modules'
    )
    if ($OutputDir.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $excludeDirs += $OutputDir
    }
    & robocopy $RepoRoot $AppDir /MIR /XD @excludeDirs /XF '*.log'
    $roboCode = $LASTEXITCODE
    if ($roboCode -gt 7) {
        throw "robocopy failed with code $roboCode"
    }
    $global:LASTEXITCODE = 0

    Write-Step "Copying one-click offline installer"
    Copy-Item -LiteralPath $InstallerSource -Destination $InstallerDest -Force

    Write-Step "Backing up Docker volumes with all settings and data"
    Backup-Volume $BackendVolume 'backend_data.tgz'
    Backup-Volume $InfluxVolume 'influxdb_data.tgz'

    Write-Step "Saving Docker images"
    $images = @(
        'telegraf:1.29',
        'influxdb:2.7',
        'alpine:3.20',
        'ahwr-50-twin-frontend:offline-flat',
        'ahwr-50-twin-backend:offline-flat',
        'ahwr-50-twin-bop-collector:offline-flat'
    )
    Run-Exe docker (@('save', '-o', $ImageTar) + $images)

    Write-Step "Writing instructions"
    @"
AHWR-50 Twin Offline Package

On the offline PC:
1. Install Docker Desktop first if it is not already installed.
2. Copy this whole folder from pendrive to the offline PC.
3. Open PowerShell in this folder.
4. Run:
   powershell -ExecutionPolicy Bypass -File .\INSTALL_AHWR_OFFLINE.ps1

This restores:
- Docker images
- dashboard layout
- PLC configuration
- users/passwords
- variables mapping
- Telegraf configuration
- InfluxDB data/history

This package intentionally excludes the central folder and does not start demo/synthetic containers.
"@ | Set-Content -LiteralPath (Join-Path $OutputDir 'README_OFFLINE.txt') -Encoding UTF8
} finally {
    Write-Step "Starting original stack again"
    Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'up', '-d', '--no-build') $RepoRoot
}

Write-Host ""
Write-Host "Offline package is ready:" -ForegroundColor Green
Write-Host "  $OutputDir"
Write-Host ""
Write-Host "Copy this whole folder to pendrive. On the offline PC, run:"
Write-Host "  .\INSTALL_AHWR_OFFLINE.ps1"
