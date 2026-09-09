param(
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'

$ProjectName = 'ahwr-50-twin'
$BackendVolume = 'ahwr-50-twin_backend_data'
$InfluxVolume = 'ahwr-50-twin_influxdb_data'

$BundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path $BundleRoot 'app'
$ImagesTar = Join-Path $BundleRoot 'images\ahwr-images.tar'
$VolumesDir = Join-Path $BundleRoot 'volumes'
$BackupDir = Join-Path $BundleRoot ("preinstall-backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))

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

function Test-DockerVolume {
    param([string]$Name)
    & docker volume inspect $Name *> $null
    return ($LASTEXITCODE -eq 0)
}

function Backup-ExistingVolume {
    param(
        [string]$Name,
        [string]$FileName
    )

    if (Test-DockerVolume $Name) {
        New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
        Write-Host "Backing up existing target volume $Name first..."
        Run-Exe docker @(
            'run', '--rm',
            '-v', "${Name}:/from:ro",
            '-v', "${BackupDir}:/backup",
            'alpine:3.20',
            'sh', '-c', "cd /from && tar czf /backup/$FileName ."
        )
        Run-Exe docker @('volume', 'rm', $Name)
    }
}

function Restore-Volume {
    param(
        [string]$Name,
        [string]$ArchiveName
    )

    $archive = Join-Path $VolumesDir $ArchiveName
    if (!(Test-Path $archive)) {
        throw "Missing volume archive: $archive"
    }

    Run-Exe docker @('volume', 'create', $Name)
    Run-Exe docker @(
        'run', '--rm',
        '-v', "${Name}:/to",
        '-v', "${VolumesDir}:/backup:ro",
        'alpine:3.20',
        'sh', '-c', "cd /to && tar xzf /backup/$ArchiveName"
    )
}

if (!(Test-Path $AppDir)) { throw "Missing app folder: $AppDir" }
if (!(Test-Path $ImagesTar)) { throw "Missing Docker image bundle: $ImagesTar" }
if (!(Test-Path (Join-Path $AppDir 'docker-compose.yml'))) { throw "Missing docker-compose.yml inside app folder." }
if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker is not installed or not in PATH. Install Docker Desktop first, then run this file again." }

Write-Step "Checking Docker"
Run-Exe docker @('version')

Write-Step "Loading Docker images from pendrive package"
Run-Exe docker @('load', '-i', $ImagesTar)

Write-Step "Stopping any old AHWR stack on this PC"
Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'down') $AppDir

Write-Step "Restoring dashboard, PLC config, users, variables, and InfluxDB data"
Backup-ExistingVolume $BackendVolume 'backend_data.tgz'
Backup-ExistingVolume $InfluxVolume 'influxdb_data.tgz'
Restore-Volume $BackendVolume 'backend_data.tgz'
Restore-Volume $InfluxVolume 'influxdb_data.tgz'

if ($NoStart) {
    Write-Host ""
    Write-Host "Installed but not started because -NoStart was used." -ForegroundColor Yellow
    exit 0
}

Write-Step "Starting AHWR-50 Twin"
Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'up', '-d', '--no-build') $AppDir

Write-Step "Checking containers"
Run-Exe docker @('compose', '-p', $ProjectName, '--env-file', '.env.example', 'ps') $AppDir

Write-Host ""
Write-Host "Done. Open this PC in browser:" -ForegroundColor Green
Write-Host "  http://localhost:8080"
Write-Host "From another PC on LAN, use:"
Write-Host "  http://<this-pc-ip>:8080"
Write-Host ""
Write-Host "All copied settings are restored: dashboard layout, PLC configuration, users/passwords, variables, telegraf config, and InfluxDB data."
if (Test-Path $BackupDir) {
    Write-Host ""
    Write-Host "Previous target-PC data was backed up here:"
    Write-Host "  $BackupDir"
}
