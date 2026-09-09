param(
    [switch]$KeepData
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-Step {
    param([string]$Message, [scriptblock]$Action)
    Write-Host $Message -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Message failed with exit code $LASTEXITCODE"
    }
}

function Read-EnvFile {
    param([string]$Path)
    $values = [ordered]@{}
    if (Test-Path -LiteralPath $Path) {
        Get-Content -LiteralPath $Path | ForEach-Object {
            if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
            $parts = $_ -split '=', 2
            $values[$parts[0].Trim()] = $parts[1]
        }
    }
    return $values
}

function Write-EnvFile {
    param([string]$Path, $Values)
    $lines = @("# Runtime settings preserved/used by AHWR-50 Twin update.")
    foreach ($key in $Values.Keys) {
        $lines += "$key=$($Values[$key])"
    }
    Set-Content -LiteralPath $Path -Value $lines
}

function Preserve-ExistingRuntimeEnv {
    param([string]$EnvPath)
    if (!$KeepData) { return }

    $values = Read-EnvFile -Path $EnvPath
    $allowedKeys = @(
        'INFLUX_USERNAME','INFLUX_PASSWORD','INFLUX_ORG','INFLUX_BUCKET','INFLUX_RETENTION','INFLUX_TOKEN',
        'JWT_SECRET','ADMIN_USERNAME','ADMIN_PASSWORD','DATA_SOURCE','MAX_WELL_DEPTH_M',
        'FRONTEND_BIND','FRONTEND_PORT','MOCK_INTERVAL_MS','CORS_ORIGIN','AUTH_MODE',
        'LDAP_URL','LDAP_BIND_DN','LDAP_BIND_PASSWORD','LDAP_SEARCH_BASE','LDAP_SEARCH_FILTER','LDAP_DOMAIN',
        'LDAP_DEFAULT_ROLE','LDAP_ROLE_ADMIN','LDAP_ROLE_OPERATOR','LDAP_ROLE_VIEWER','LDAP_STARTTLS','LDAP_TLS_REJECT_UNAUTHORIZED',
        'SYNC_ENABLED','CENTRAL_URL','DEVICE_ID','DEVICE_TOKEN','SYNC_BATCH_SECONDS','SYNC_BUFFER_DAYS',
        'ETP_ENABLED','ETP_URL','ETP_STREAM_SECONDS'
    )
    $containerNames = @(
        'ahwr-50-twin-backend','ahwr-50-twin-telegraf','ahwr-50-twin-influxdb','ahwr-50-twin-frontend',
        'romii_backend','romii_telegraf','romii_influxdb','romii_frontend'
    )

    foreach ($container in $containerNames) {
        $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $container } | Select-Object -First 1
        if (!$exists) { continue }
        $envLines = @(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' $container 2>$null)
        foreach ($line in $envLines) {
            if ($line -notmatch '=') { continue }
            $parts = $line -split '=', 2
            $key = $parts[0]
            if ($allowedKeys -contains $key) {
                $values[$key] = $parts[1]
            }
        }
    }

    $frontend = docker ps -a --format "{{.Names}}" | Where-Object { $_ -in @('ahwr-50-twin-frontend','romii_frontend') } | Select-Object -First 1
    if ($frontend) {
        try {
            $inspect = docker inspect $frontend | ConvertFrom-Json
            $binding = $inspect[0].HostConfig.PortBindings.'80/tcp' | Select-Object -First 1
            if ($binding) {
                if ($binding.HostIp) { $values['FRONTEND_BIND'] = $binding.HostIp }
                if ($binding.HostPort) { $values['FRONTEND_PORT'] = $binding.HostPort }
            }
        } catch {
            Write-Host "Could not read previous frontend port; keeping .env value." -ForegroundColor Yellow
        }
    }

    if (!$values.Contains('FRONTEND_BIND')) { $values['FRONTEND_BIND'] = '0.0.0.0' }
    if (!$values.Contains('FRONTEND_PORT')) { $values['FRONTEND_PORT'] = '8080' }
    if (!$values.Contains('DATA_SOURCE')) { $values['DATA_SOURCE'] = 'plc' }

    Write-Host "Preserving existing offline PC runtime settings from Docker containers." -ForegroundColor Yellow
    Write-EnvFile -Path $EnvPath -Values $values
}

Push-Location $projectRoot
try {
    $flatAppImagesArchive = Join-Path $projectRoot "docker_images\app_images_flat.tar"
    $appImagesArchive = Join-Path $projectRoot "docker_images\app_images.tar"
    $fullImagesArchive = Join-Path $projectRoot "docker_images\images.tar"
    $imagesArchive = if (Test-Path -LiteralPath $flatAppImagesArchive) { $flatAppImagesArchive } elseif (Test-Path -LiteralPath $appImagesArchive) { $appImagesArchive } else { $fullImagesArchive }
    $backendBackup = Join-Path $projectRoot "volume_backups\backend_data.tar"
    $influxBackup = Join-Path $projectRoot "volume_backups\influxdb_data.tar"

    $requiredFiles = @($imagesArchive, (Join-Path $projectRoot ".env"))
    if (!$KeepData) {
        $requiredFiles += @($backendBackup, $influxBackup)
    }

    foreach ($requiredFile in $requiredFiles) {
        if (!(Test-Path -LiteralPath $requiredFile)) {
            throw "Required transfer file is missing: $requiredFile"
        }
    }

    $imagesHashFile = "$imagesArchive.sha256"
    if (Test-Path -LiteralPath $imagesHashFile) {
        Write-Host "Verifying transferred Docker image archive..." -ForegroundColor Cyan
        $expectedHash = ((Get-Content -LiteralPath $imagesHashFile -Raw).Trim() -split '\s+')[0].ToUpperInvariant()
        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $imagesArchive).Hash.ToUpperInvariant()
        if (!$expectedHash -or $actualHash -ne $expectedHash) {
            throw "Docker image archive is incomplete or corrupted. Recopy $([IO.Path]::GetFileName($imagesArchive)) and $([IO.Path]::GetFileName($imagesHashFile)) from the source PC."
        }
        Write-Host "Docker image archive checksum verified." -ForegroundColor Green
    } else {
        Write-Warning "images.tar.sha256 is missing; transfer integrity cannot be verified."
    }

    Write-Host "Checking Docker image archive structure..." -ForegroundColor Cyan
    & tar -tf $imagesArchive *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker image archive cannot be read. Recopy $([IO.Path]::GetFileName($imagesArchive)) from the source PC."
    }

    Write-Host "========================================================"
    Write-Host " Restoring complete AHWR-50-Twin installation"
    Write-Host "========================================================"

    Preserve-ExistingRuntimeEnv -EnvPath (Join-Path $projectRoot ".env")

    Run-Step "[0/7] Loading replacement Docker images before stopping the current application..." {
        docker load -i $imagesArchive
    }

    $requiredImages = @('ahwr-50-twin-backend:offline-flat', 'ahwr-50-twin-frontend:offline-flat', 'telegraf:offline-flat', 'influxdb:2.7')
    foreach ($requiredImage in $requiredImages) {
        docker image inspect $requiredImage *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Required offline image is unavailable: $requiredImage. The current application was not removed."
        }
    }
    $global:LASTEXITCODE = 0

    Write-Host "[1/7] Removing old AHWR containers..." -ForegroundColor Cyan
    docker compose down --remove-orphans
    $oldContainers = @(docker ps -a --format "{{.Names}}" | Where-Object {
        $_ -in @('ahwr-50-twin-frontend', 'ahwr-50-twin-backend', 'ahwr-50-twin-telegraf', 'ahwr-50-twin-influxdb')
    })
    if ($oldContainers.Count -gt 0) {
        docker rm -f @oldContainers
    }
    $global:LASTEXITCODE = 0

    docker compose down --remove-orphans

    Run-Step "[2/7] Creating application volumes..." {
        docker volume create ahwr-50-twin_backend_data
        docker volume create ahwr-50-twin_influxdb_data
    }

    if (!$KeepData) {
        Run-Step "[3/7] Restoring users and application settings..." {
            docker run --rm --user 0:0 --entrypoint sh `
                -v ahwr-50-twin_backend_data:/target `
                -v "${projectRoot}:/backup:ro" `
                ahwr-50-twin-backend:offline-flat `
                -c "rm -rf /target/* /target/.[!.]* /target/..?* 2>/dev/null || true; cd /target && tar -xf /backup/volume_backups/backend_data.tar && chown -R 1000:1000 /target"
        }

        Run-Step "[4/7] Restoring InfluxDB historical data..." {
            docker run --rm --user 0:0 --entrypoint sh `
                -v ahwr-50-twin_influxdb_data:/target `
                -v "${projectRoot}:/backup:ro" `
                influxdb:2.7 `
                -c "rm -rf /target/* /target/.[!.]* /target/..?* 2>/dev/null || true; cd /target && tar -xf /backup/volume_backups/influxdb_data.tar"
        }
    } else {
        Write-Host "[3/7] Skipping users and application settings restore (-KeepData flag is set)" -ForegroundColor Yellow
        Write-Host "[4/7] Skipping InfluxDB historical data restore (-KeepData flag is set)" -ForegroundColor Yellow
    }

    Run-Step "[5/7] Starting application without internet pulls..." {
        docker compose up -d --force-recreate --no-build --pull never
    }
    Write-Host "[6/7] Checking containers..." -ForegroundColor Cyan
    docker compose ps

    Write-Host ""
    Write-Host "SUCCESS: Code, images, users, settings and history were restored." -ForegroundColor Green
    Write-Host "Open on this PC: http://localhost:8080"
    $edgeIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -ExpandProperty IPAddress -First 1
    if ($edgeIp) { Write-Host "Open from network PC: http://${edgeIp}:8080" }
}
finally {
    Pop-Location
}
