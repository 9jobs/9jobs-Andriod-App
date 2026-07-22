$ErrorActionPreference = "Stop"

$AdbPath = "C:\Users\USER\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LocalExpoBinary = Join-Path $ProjectRoot "node_modules\.bin\expo.cmd"
$AppPackage = "com.ninejobs.mobile"
$MainActivity = "$AppPackage/.MainActivity"
$ExpoGoPackage = "host.exp.exponent"
$MetroPortCandidates = 8091..8100

if (-not (Test-Path -LiteralPath $AdbPath)) {
  throw "adb.exe not found at '$AdbPath'."
}

if (-not (Test-Path -LiteralPath $LocalExpoBinary)) {
  throw "Local Expo CLI not found at '$LocalExpoBinary'. Run npm install inside the mobile app first."
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

function Test-PortInUse {
  param(
    [int]$Port
  )

  try {
    $listener = [System.Net.Sockets.TcpClient]::new()
    $connectTask = $listener.ConnectAsync([System.Net.IPAddress]::Loopback, $Port)
    $connected = $connectTask.Wait(400)
    $isConnected = $connected -and $listener.Connected
    $listener.Dispose()
    return $isConnected
  } catch {
    return $false
  }
}

function Get-FreeMetroPort {
  foreach ($port in $MetroPortCandidates) {
    if (-not (Test-PortInUse -Port $port)) {
      return $port
    }
  }

  throw "No free Metro port found in the expected range 8091-8100."
}

function Wait-For-MetroReady {
  param(
    [int]$Port,
    [int]$MaxAttempts = 45
  )

  $attempts = 0
  while ($attempts -lt $MaxAttempts) {
    if (Test-MetroEndpoint -Port $Port) {
      return
    }

    Start-Sleep -Seconds 2
    $attempts += 1
  }

  throw "Metro endpoint on port $Port did not become ready within the expected time."
}

function Get-PhysicalAndroidDevices {
  $lines = & $AdbPath devices
  $devices = @()

  foreach ($line in $lines) {
    if ($line -match "^(?<id>[^\s]+)\s+device$" -and $line -notmatch "^emulator-") {
      $devices += $Matches["id"]
    }
  }

  return $devices
}

function Ensure-PhoneConnected {
  & $AdbPath start-server | Out-Null
  $devices = Get-PhysicalAndroidDevices

  if (-not $devices -or $devices.Count -eq 0) {
    throw "No physical Android phone detected. Connect the phone via USB, enable Developer options + USB debugging, then tap 'Allow' on the RSA prompt."
  }

  return $devices[0]
}

function Ensure-AppInstalled {
  param(
    [string]$DeviceId
  )

  $packagePath = & $AdbPath -s $DeviceId shell pm path $AppPackage
  if ($LASTEXITCODE -eq 0 -and $packagePath -match "^package:") {
    return
  }

  throw "9Jobs dev client is not installed on device '$DeviceId'. Install the dev APK first."
}

function Ensure-DeviceUnlocked {
  param(
    [string]$DeviceId
  )

  & $AdbPath -s $DeviceId shell input keyevent 224 | Out-Null
  & $AdbPath -s $DeviceId shell wm dismiss-keyguard | Out-Null
  & $AdbPath -s $DeviceId shell input keyevent 82 | Out-Null
}

function Start-MetroInBackground {
  param(
    [int]$Port
  )

  $command = "Set-Location '$ProjectRoot'; cmd /c `"$LocalExpoBinary start --dev-client --port $Port --clear`""
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $command -WorkingDirectory $ProjectRoot | Out-Null
  Wait-For-MetroReady -Port $Port
}

function Open-DevClientOnPhone {
  param(
    [string]$DeviceId,
    [int]$Port
  )

  Write-Host "Reversing Metro port $Port to the connected phone..." -ForegroundColor Cyan
  & $AdbPath -s $DeviceId reverse "tcp:$Port" "tcp:$Port" | Out-Null
  & $AdbPath -s $DeviceId reverse "tcp:8082" "tcp:8082" | Out-Null

  Write-Host "Restarting 9Jobs app on the phone..." -ForegroundColor Cyan
  & $AdbPath -s $DeviceId shell am force-stop $ExpoGoPackage | Out-Null
  & $AdbPath -s $DeviceId shell am force-stop $AppPackage | Out-Null
  & $AdbPath -s $DeviceId shell am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n $MainActivity | Out-Null

  $devClientUrl = "ninejobs://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$Port"
  & $AdbPath -s $DeviceId shell am start -W -a android.intent.action.VIEW -d $devClientUrl $AppPackage | Out-Null
}

$deviceId = Ensure-PhoneConnected
Ensure-AppInstalled -DeviceId $deviceId
Ensure-DeviceUnlocked -DeviceId $deviceId

$metroPort = $null
foreach ($port in $MetroPortCandidates) {
  if (Test-MetroEndpoint -Port $port) {
    $metroPort = $port
    break
  }
}

if (-not $metroPort) {
  $metroPort = Get-FreeMetroPort
  Write-Host "Starting Expo dev server for the connected Android phone on port $metroPort..." -ForegroundColor Cyan
  Start-MetroInBackground -Port $metroPort
} else {
  Write-Host "Using existing Metro server on port $metroPort." -ForegroundColor Cyan
}

Open-DevClientOnPhone -DeviceId $deviceId -Port $metroPort

Write-Host "9Jobs dev client opened on phone '$deviceId'." -ForegroundColor Green
Write-Host "USB reverse is active, so QR/LAN host errors are bypassed." -ForegroundColor Green
