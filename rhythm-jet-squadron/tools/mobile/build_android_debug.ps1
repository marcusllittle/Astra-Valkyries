param(
  [switch]$SkipWebBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$androidRoot = Join-Path $projectRoot "android"

if (-not $env:JAVA_HOME) {
  $env:JAVA_HOME = Join-Path $env:ProgramFiles "Android\Android Studio\jbr"
}
if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}

if (-not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  throw "Java was not found under JAVA_HOME: $env:JAVA_HOME"
}
if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "Android SDK was not found under ANDROID_HOME: $env:ANDROID_HOME"
}

Push-Location $projectRoot
try {
  if (-not (Test-Path $androidRoot)) {
    & npx.cmd cap add android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor Android project creation failed" }
  }
  if (-not $SkipWebBuild) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor Android sync failed" }
  }
  Push-Location $androidRoot
  try {
    $gradle = Start-Process -FilePath (Join-Path $androidRoot "gradlew.bat") `
      -ArgumentList "assembleDebug" -NoNewWindow -PassThru -Wait
    if ($gradle.ExitCode -ne 0) { throw "Android debug build failed" }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

