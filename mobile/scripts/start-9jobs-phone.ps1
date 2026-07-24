$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LocalExpoBinary = Join-Path $ProjectRoot "node_modules\.bin\expo.cmd"
$MetroPortCandidates = 8091..8100
$MetroCleanupPortCandidates = 8081..8100
$TunnelRetryCount = 1
$MetroStartupWaitSeconds = 20
$PhoneOnlyAndroidSdkBypass = Join-Path $ProjectRoot ".expo-phone-no-android-sdk\missing-sdk"

function Test-MetroEndpoint {
  param(
    [int]$Port
  )

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/status" -UseBasicParsing -TimeoutSec 2
    if ($response.Content -is [byte[]]) {
      $content = [System.Text.Encoding]::UTF8.GetString($response.Content).Trim()
    } else {
      $content = ($response.Content | Out-String).Trim()
    }

    return $response.StatusCode -eq 200 -and $content -eq "packager-status:running"
  } catch {
    return $false
  }
}

function Test-PortInUse {
  param(
    [int]$Port
  )

  try {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    return ($listeners | Measure-Object).Count -gt 0
  } catch {
    return $false
  }
}

function Get-ListeningProcessIdsForMetroPorts {
  $rawEntries = netstat -ano | Select-String -Pattern "LISTENING"
  $processIds = [System.Collections.Generic.HashSet[int]]::new()

  foreach ($entry in $rawEntries) {
    $line = ($entry.ToString() -replace "\s+", " ").Trim()
    foreach ($port in $MetroCleanupPortCandidates) {
      if ($line -match "[:\.]$port\s") {
        $parts = $line.Split(" ")
        $processIdText = $parts[$parts.Length - 1]
        $parsedProcessId = 0
        if ([int]::TryParse($processIdText, [ref]$parsedProcessId)) {
          [void]$processIds.Add($parsedProcessId)
        }
      }
    }
  }

  return @($processIds)
}

function Stop-StaleMetroProcesses {
  $processIds = Get-ListeningProcessIdsForMetroPorts
  if (-not $processIds -or $processIds.Count -eq 0) {
    return
  }

  foreach ($processId in $processIds) {
    try {
      $process = Get-Process -Id $processId -ErrorAction Stop
      if ($process.ProcessName -ne "node") {
        continue
      }

      Write-Host "Stopping stale Metro process on testing port range (PID $processId)..." -ForegroundColor Yellow
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
    }
  }

  Start-Sleep -Seconds 2
}

function Get-FreeMetroPort {
  foreach ($port in $MetroPortCandidates) {
    if (Test-PortInUse -Port $port) {
      continue
    }

    $listener = $null

    try {
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
      $listener.Start()
      return $port
    } catch {
    } finally {
      if ($listener) {
        $listener.Stop()
      }
    }
  }

  throw "No free Metro port found in the expected range 8091-8100."
}

function Wait-For-MetroReady {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = $MetroStartupWaitSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-MetroEndpoint -Port $Port) {
      return $true
    }

    Start-Sleep -Milliseconds 750
  }

  return $false
}

function Start-ExpoForPhone {
  param(
    [ValidateSet("tunnel", "lan")]
    [string]$HostMode,
    [int]$Port
  )

  $clearFlag = "--clear"
  if (-not (Test-Path $LocalExpoBinary)) {
    throw "Local Expo CLI not found at $LocalExpoBinary. Run npm install inside the mobile app first."
  }

  $commandParts = @(
    "`"$LocalExpoBinary`"",
    "start",
    "--dev-client",
    "--host",
    $HostMode,
    "--port",
    "$Port"
  )
  if ($clearFlag) {
    $commandParts += $clearFlag
  }

  $previousAndroidHome = $env:ANDROID_HOME
  $previousAndroidSdkRoot = $env:ANDROID_SDK_ROOT

  try {
    # Force Expo tunnel startup to skip adb reverse in phone-only mode.
    # The path is intentionally invalid so @expo/cli treats Android SDK as unavailable.
    $env:ANDROID_HOME = $PhoneOnlyAndroidSdkBypass
    $env:ANDROID_SDK_ROOT = $PhoneOnlyAndroidSdkBypass
    $commandLine = $commandParts -join " "
    & cmd.exe /c $commandLine
  } finally {
    if ($null -eq $previousAndroidHome) {
      Remove-Item Env:ANDROID_HOME -ErrorAction SilentlyContinue
    } else {
      $env:ANDROID_HOME = $previousAndroidHome
    }

    if ($null -eq $previousAndroidSdkRoot) {
      Remove-Item Env:ANDROID_SDK_ROOT -ErrorAction SilentlyContinue
    } else {
      $env:ANDROID_SDK_ROOT = $previousAndroidSdkRoot
    }
  }

  return $LASTEXITCODE
}

Stop-StaleMetroProcesses
$MetroPort = Get-FreeMetroPort

Write-Host "Starting 9Jobs phone testing server on port $MetroPort..." -ForegroundColor Cyan
Write-Host "The script will start the phone build in a visible Expo terminal flow." -ForegroundColor Yellow
Write-Host "Open the installed 9Jobs dev app and scan the QR shown below." -ForegroundColor Yellow

Push-Location $ProjectRoot
try {
  $phoneServerStarted = $false

  Write-Host "Using LAN mode. Make sure the phone and this PC are on the same Wi-Fi." -ForegroundColor Yellow
  $exitCode = Start-ExpoForPhone -HostMode "lan" -Port $MetroPort
  if ($exitCode -eq 0) {
    $phoneServerStarted = $true
  } else {
    Write-Host "Expo LAN startup failed with exit code $exitCode." -ForegroundColor Red
    exit 1
  }
} finally {
  Pop-Location
}
