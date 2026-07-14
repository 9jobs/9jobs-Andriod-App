$ErrorActionPreference = "Stop"

$AdbPath = "C:\Users\USER\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$EmulatorPath = "C:\Users\USER\AppData\Local\Android\Sdk\emulator\emulator.exe"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AppPackage = "com.ninejobs.mobile"
$MainActivity = "$AppPackage/.MainActivity"
$ExpoGoPackage = "host.exp.exponent"
$AvdName = "Pixel_7"
$MetroPortCandidates = 8081..8090

if (-not (Test-Path -LiteralPath $AdbPath)) {
  throw "adb.exe not found at '$AdbPath'."
}

if (-not (Test-Path -LiteralPath $EmulatorPath)) {
  throw "emulator.exe not found at '$EmulatorPath'."
}

function Test-PortListening {
  param(
    [int]$Port
  )

  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-ActiveMetroPort {
  foreach ($port in $MetroPortCandidates) {
    if (Test-PortListening -Port $port) {
      return $port
    }
  }

  return $null
}

function Get-FreeMetroPort {
  foreach ($port in $MetroPortCandidates) {
    if (-not (Test-PortListening -Port $port)) {
      return $port
    }
  }

  throw "No free Metro port found in the expected range 8081-8090."
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

  Write-Host "Waiting for Metro bundle endpoint on port $Port..." -ForegroundColor Cyan

  $attempts = 0
  while ($true) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
    }

    Start-Sleep -Seconds 2
    $attempts += 1

    if ($attempts -ge 45) {
      throw "Metro endpoint on port $Port did not become ready within the expected time."
    }
  }
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
  Write-Host "Starting Expo dev server for the native 9Jobs app..." -ForegroundColor Cyan
  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npx expo start --dev-client --clear --port $MetroPort" `
    -WorkingDirectory $ProjectRoot | Out-Null

  $attempts = 0
  while (-not (Test-PortListening -Port $MetroPort)) {
    Start-Sleep -Seconds 2
    $attempts += 1

    if ($attempts -ge 45) {
      throw "Metro did not start on port $MetroPort within the expected time."
    }
  }
}

Ensure-EmulatorReady
Ensure-NativeAppInstalled
Ensure-EmulatorUnlocked
Wait-For-MetroReady -Port $MetroPort

Write-Host "Using Metro port $MetroPort." -ForegroundColor Cyan
Write-Host "Reversing Metro port to the emulator..." -ForegroundColor Cyan
& $AdbPath reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null

Write-Host "Stopping Expo Go if it is running..." -ForegroundColor Cyan
& $AdbPath shell am force-stop $ExpoGoPackage | Out-Null
& $AdbPath shell am force-stop $AppPackage | Out-Null

Start-NineJobsApp -Port $MetroPort

Write-Host "9Jobs app is open in the foreground." -ForegroundColor Green
