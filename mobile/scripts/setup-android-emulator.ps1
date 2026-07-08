$ErrorActionPreference = "Stop"

$SdkRoot = "C:\Users\USER\AppData\Local\Android\Sdk"
$CmdToolsLatest = Join-Path $SdkRoot "cmdline-tools\latest\bin"
$PlatformTools = Join-Path $SdkRoot "platform-tools"
$EmulatorDir = Join-Path $SdkRoot "emulator"
$SystemImage = "system-images;android-35;google_apis;x86_64"
$Platform = "platforms;android-35"
$AvdName = "Pixel_7"
$DeviceName = "pixel_7"

function Assert-PathExists {
  param(
    [string]$PathValue,
    [string]$Message
  )

  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw $Message
  }
}

Write-Host "Checking Android command line tools..." -ForegroundColor Cyan
Assert-PathExists $CmdToolsLatest "Android cmdline-tools not found at '$CmdToolsLatest'. Install Android Studio or Android command-line tools first."

$SdkManager = Join-Path $CmdToolsLatest "sdkmanager.bat"
$AvdManager = Join-Path $CmdToolsLatest "avdmanager.bat"

Assert-PathExists $SdkManager "sdkmanager.bat not found at '$SdkManager'."
Assert-PathExists $AvdManager "avdmanager.bat not found at '$AvdManager'."

Write-Host "Setting Android environment variables..." -ForegroundColor Cyan
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkRoot, "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkRoot, "User")

$oldPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$segments = @($PlatformTools, $EmulatorDir, $CmdToolsLatest)
$newPath = $oldPath

foreach ($segment in $segments) {
  if ($newPath -notlike "*$segment*") {
    $newPath = "$newPath;$segment"
  }
}

[System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")

Write-Host "Installing Android SDK packages..." -ForegroundColor Cyan
& $SdkManager "platform-tools" "emulator" $Platform $SystemImage

Write-Host "Accepting Android SDK licenses..." -ForegroundColor Cyan
$licenseAnswers = @()
1..40 | ForEach-Object { $licenseAnswers += "y" }
$licenseAnswers -join [Environment]::NewLine | & $SdkManager --licenses

$EmulatorExe = Join-Path $EmulatorDir "emulator.exe"
Assert-PathExists $EmulatorExe "emulator.exe not found at '$EmulatorExe' after package install."

Write-Host "Creating AVD if needed..." -ForegroundColor Cyan
$existingAvds = & $EmulatorExe -list-avds 2>$null
if ($existingAvds -notcontains $AvdName) {
  "no" | & $AvdManager create avd -n $AvdName -k $SystemImage -d $DeviceName
} else {
  Write-Host "AVD '$AvdName' already exists." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Android emulator setup complete." -ForegroundColor Green
Write-Host "Close this PowerShell window and open a new one before using adb/emulator from PATH." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run the emulator:" -ForegroundColor Cyan
Write-Host "`"$EmulatorExe`" -avd $AvdName"
Write-Host ""
Write-Host "Run the app:" -ForegroundColor Cyan
Write-Host "cd D:\9jobs-App\mobile"
Write-Host "npx expo start --android"
