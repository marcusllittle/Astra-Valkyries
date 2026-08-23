param(
  [string]$Blender = "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
  [string]$StagingDir = "$PSScriptRoot\staging"
)

$ErrorActionPreference = "Stop"
$AppRoot = Resolve-Path "$PSScriptRoot\..\.."
$BlenderRoot = Join-Path $AppRoot "tools\blender"
$Exporter = Join-Path $BlenderRoot "export_unreal_geometry.py"

$Jobs = @(
  @{ Profile = "launch-v2"; Source = "astra_interceptor_launch_v2.blend" },
  @{ Profile = "weapon-vfx"; Source = "astra_weapon_vfx.blend" },
  @{ Profile = "secondary-boss-vfx"; Source = "astra_secondary_boss_vfx.blend" }
)

if (-not (Test-Path $Blender)) {
  throw "Blender executable not found: $Blender"
}

foreach ($Job in $Jobs) {
  $Source = Join-Path $BlenderRoot $Job.Source
  $Output = Join-Path $StagingDir $Job.Profile
  if (Test-Path $Output) {
    Remove-Item -Recurse -Force $Output
  }
  New-Item -ItemType Directory -Force -Path $Output | Out-Null

  & $Blender $Source --background --python $Exporter -- `
    --profile $Job.Profile `
    --source $Source `
    --output-dir $Output

  if ($LASTEXITCODE -ne 0) {
    throw "Blender export failed for $($Job.Profile)"
  }
}

Write-Host "Astra Blender exports are ready in $StagingDir"
