$ErrorActionPreference = "Stop"

$AdbPath = "C:\Users\USER\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$EmulatorPath = "C:\Users\USER\AppData\Local\Android\Sdk\emulator\emulator.exe"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LocalExpoBinary = Join-Path $ProjectRoot "node_modules\.bin\expo.cmd"
$ExpoLaunchLog = Join-Path $ProjectRoot ".expo\android-launch.log"
$AppPackage = "com.ninejobs.mobile"
$MainActivity = "$AppPackage/.MainActivity"
$ExpoGoPackage = "host.exp.exponent"
$AvdName = "Pixel_7"
$MetroPortCandidates = 8091..8100

if (-not (Test-Path -LiteralPath $AdbPath)) {
  throw "adb.exe not found at '$AdbPath'."
}

if (-not (Test-Path -LiteralPath $EmulatorPath)) {
  throw "emulator.exe not found at '$EmulatorPath'."
}

if (-not (Test-Path -LiteralPath $LocalExpoBinary)) {
  throw "Local Expo CLI not found at '$LocalExpoBinary'. Run npm install inside the mobile app first."
}

function Test-PortListening {
  param(
    [int]$Port
  )

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connectTask = $client.ConnectAsync([System.Net.IPAddress]::Loopback, $Port)
    $connected = $connectTask.Wait(500)
    $isListening = $connected -and $client.Connected
    $client.Dispose()
    return $isListening
  } catch {
    return $false
  }
}

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

function Get-ActiveMetroPort {
  foreach ($port in 8081..8090) {
    if (Test-MetroEndpoint -Port $port) {
      return $port
    }
  }

  foreach ($port in $MetroPortCandidates) {
    if (Test-MetroEndpoint -Port $port) {
      return $port
    }
  }

  return $null
}

function Get-FreeMetroPort {
  foreach ($port in $MetroPortCandidates) {
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

function Ensure-EmulatorReady {
  $connectedDevices = & $AdbPath devices

  if ($connectedDevices -notmatch "emulator-\d+\s+device") {
    Write-Host "Starting Android emulator '$AvdName'..." -ForegroundColor Cyan
    Start-Process -FilePath $EmulatorPath -ArgumentList "-avd", $AvdName -WindowStyle Hidden | Out-Null
  }

  Write-Host "Waiting for Android emulator/device to be ready..." -ForegroundColor Cyan
  & $AdbPath wait-for-device | Out-Null
}

function Test-AppInstalled {
  $packagePath = & $AdbPath shell pm path $AppPackage
  return $LASTEXITCODE -eq 0 -and $packagePath -match "^package:"
}

function Ensure-NativeAppInstalled {
  if (Test-AppInstalled) {
    return
  }

  Write-Host "9Jobs native app not installed. Building and installing debug app..." -ForegroundColor Cyan
  Push-Location $ProjectRoot

  try {
    npx expo run:android
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to build/install the native 9Jobs Android app."
    }
  } finally {
    Pop-Location
  }
}

function Ensure-EmulatorUnlocked {
  Write-Host "Waking Android emulator..." -ForegroundColor Cyan
  & $AdbPath shell input keyevent 224 | Out-Null
  & $AdbPath shell wm dismiss-keyguard | Out-Null
  & $AdbPath shell input keyevent 82 | Out-Null
}

function Wait-For-MetroReady {
  param(
    [int]$Port
  )

  Write-Host "Waiting for Metro endpoint on port $Port..." -ForegroundColor Cyan

  $attempts = 0
  while ($true) {
    if (Test-MetroEndpoint -Port $Port) {
      return
    }

    Start-Sleep -Seconds 2
    $attempts += 1

    if ($attempts -ge 45) {
      throw "Metro endpoint on port $Port did not become ready within the expected time."
    }
  }
}

function Start-MetroServer {
  param(
    [int]$Port
  )

  $expoArgs = "`"$LocalExpoBinary`" start --dev-client --host localhost --port $Port --clear"
  $logDirectory = Split-Path -Parent $ExpoLaunchLog
  if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  }

  if (Test-Path -LiteralPath $ExpoLaunchLog) {
    Remove-Item -LiteralPath $ExpoLaunchLog -Force -ErrorAction SilentlyContinue
  }

  Write-Host "Starting Expo dev server on localhost:$Port..." -ForegroundColor Cyan
  Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", $expoArgs `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $ExpoLaunchLog `
    -RedirectStandardError $ExpoLaunchLog `
    -WindowStyle Hidden | Out-Null
}

function Get-ForegroundPackage {
  $activityLine = & $AdbPath shell dumpsys activity activities | Select-String "topResumedActivity|mResumedActivity" | Select-Object -First 1
  if ($activityLine) {
    $activityMatch = [regex]::Match($activityLine.ToString(), ' ([A-Za-z0-9\._]+)\/')
    if ($activityMatch.Success) {
      return $activityMatch.Groups[1].Value
    }
  }

  $focusLine = & $AdbPath shell dumpsys window windows | Select-String "mCurrentFocus" | Select-Object -First 1
  if ($focusLine) {
    $focusMatch = [regex]::Match($focusLine.ToString(), ' ([A-Za-z0-9\._]+)\/')
    if ($focusMatch.Success) {
      return $focusMatch.Groups[1].Value
    }
  }

  return $null
}

function Wait-For-AppForeground {
  param(
    [string]$ExpectedPackage,
    [int]$MaxAttempts = 15
  )

  $attempts = 0
  while ($attempts -lt $MaxAttempts) {
    $foregroundPackage = Get-ForegroundPackage
    if ($foregroundPackage -eq $ExpectedPackage) {
      return $true
    }

    Start-Sleep -Seconds 1
    $attempts += 1
  }

  return $false
}

function Start-NineJobsApp {
  param(
    [int]$Port
  )

  Write-Host "Opening 9Jobs native app..." -ForegroundColor Cyan

  # Cold start the launcher activity so the app boots into its initial splash/root state.
  & $AdbPath shell am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n $MainActivity | Out-Null

  $DevClientUrl = "ninejobs://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$Port"
  & $AdbPath shell am start -W -a android.intent.action.VIEW -d $DevClientUrl $AppPackage | Out-Null

  if (-not (Wait-For-AppForeground -ExpectedPackage $AppPackage)) {
    Write-Host "Primary launch path did not keep 9Jobs in foreground. Retrying with monkey launcher..." -ForegroundColor Yellow
    & $AdbPath shell monkey -p $AppPackage -c android.intent.category.LAUNCHER 1 | Out-Null

    if (-not (Wait-For-AppForeground -ExpectedPackage $AppPackage)) {
      throw "9Jobs app launch intent was sent, but the app did not come to the foreground."
    }
  }
}

$MetroPort = Get-ActiveMetroPort

if (-not $MetroPort) {
  $MetroPort = Get-FreeMetroPort
  Start-MetroServer -Port $MetroPort
  Wait-For-MetroReady -Port $MetroPort
}

Ensure-EmulatorReady
Ensure-NativeAppInstalled
Ensure-EmulatorUnlocked
Wait-For-MetroReady -Port $MetroPort

Write-Host "Using Metro port $MetroPort." -ForegroundColor Cyan
Write-Host "Reversing Metro port to the emulator..." -ForegroundColor Cyan
& $AdbPath reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
& $AdbPath reverse "tcp:8082" "tcp:8082" | Out-Null

Write-Host "Stopping Expo Go if it is running..." -ForegroundColor Cyan
& $AdbPath shell am force-stop $ExpoGoPackage | Out-Null
& $AdbPath shell am force-stop $AppPackage | Out-Null

Start-NineJobsApp -Port $MetroPort

Write-Host "9Jobs app is open in the foreground." -ForegroundColor Green
