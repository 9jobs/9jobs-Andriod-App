$ErrorActionPreference = "Stop"

$AdbPath = "C:\Users\USER\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path -LiteralPath $AdbPath)) {
  throw "adb.exe not found at '$AdbPath'."
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

if (-not (Test-PortListening -Port 8081)) {
  Write-Host "Starting Expo dev server for the native 9Jobs app..." -ForegroundColor Cyan
  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npx expo start --dev-client --clear" `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden | Out-Null

  $attempts = 0
  while (-not (Test-PortListening -Port 8081)) {
    Start-Sleep -Seconds 2
    $attempts += 1

    if ($attempts -ge 45) {
      throw "Metro did not start on port 8081 within the expected time."
    }
  }
}

Write-Host "Waiting for Android emulator/device to be ready..." -ForegroundColor Cyan
& $AdbPath wait-for-device | Out-Null

Write-Host "Reversing Metro port to the emulator..." -ForegroundColor Cyan
& $AdbPath reverse tcp:8081 tcp:8081 | Out-Null

Write-Host "Opening 9Jobs native app..." -ForegroundColor Cyan
& $AdbPath shell monkey -p com.ninejobs.mobile -c android.intent.category.LAUNCHER 1 | Out-Null

Write-Host "9Jobs launch intent sent." -ForegroundColor Green

