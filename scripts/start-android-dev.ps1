$ErrorActionPreference = "Stop"

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$emulatorExe = Join-Path $sdk "emulator\emulator.exe"
$adbExe = Join-Path $sdk "platform-tools\adb.exe"
$defaultAvd = "Medium_Phone_API_36.1"
$targetAvd = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { $defaultAvd }

if (-not (Test-Path $emulatorExe)) {
  throw "Android emulator binary not found at $emulatorExe"
}

if (-not (Test-Path $adbExe)) {
  throw "adb not found at $adbExe"
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$($sdk)\platform-tools;$($sdk)\emulator;$env:Path"

$avdList = & $emulatorExe -list-avds
if (-not ($avdList -contains $targetAvd)) {
  throw "AVD '$targetAvd' not found. Available: $($avdList -join ', ')"
}

$deviceOutput = & $adbExe devices
$hasReadyDevice = $deviceOutput -match "emulator-\d+\s+device" -or $deviceOutput -match "^\S+\s+device$"

if (-not $hasReadyDevice) {
  Write-Host "Starting emulator '$targetAvd'..."
  Start-Process -FilePath $emulatorExe -ArgumentList "-avd $targetAvd"

  $ready = $false
  for ($i = 0; $i -lt 150; $i++) {
    Start-Sleep -Seconds 2
    $state = (& $adbExe devices) -join "`n"
    if ($state -match "emulator-\d+\s+device") {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    throw "Emulator did not become ready in time."
  }
}

Write-Host "Launching Expo on Android..."
npx expo start --android
