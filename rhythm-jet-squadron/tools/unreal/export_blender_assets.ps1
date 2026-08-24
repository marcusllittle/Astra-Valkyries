param(
  [string]$Blender = "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
  [string]$StagingDir = "$PSScriptRoot\staging",
  [string[]]$Profiles = @()
)

if ($Profiles.Count -gt 0) {
  [string[]]$KnownProfiles = @(
    "launch-v2",
    "weapon-vfx",
    "secondary-boss-vfx",
    "aegis-boss"
  )
  [string[]]$UnknownProfiles = @($Profiles | Where-Object { $_ -notin $KnownProfiles })
  if ($UnknownProfiles.Count -gt 0) {
    throw "Unknown Blender export profile(s): $($UnknownProfiles -join ', ')"
  }
}

$ErrorActionPreference = "Stop"
$AppRoot = Resolve-Path "$PSScriptRoot\..\.."
$BlenderRoot = Join-Path $AppRoot "tools\blender"
$Exporter = Join-Path $BlenderRoot "export_unreal_geometry.py"

$Jobs = @(
  @{ Profile = "launch-v2"; Source = "astra_interceptor_launch_v2.blend" },
  @{ Profile = "weapon-vfx"; Source = "astra_weapon_vfx.blend" },
  @{ Profile = "secondary-boss-vfx"; Source = "astra_secondary_boss_vfx.blend" },
  @{
    Profile = "aegis-boss"
    Source = "astra_aegis_dreadnought.blend"
    Generator = "generate_aegis_dreadnought.py"
  }
)

if (-not (Test-Path $Blender)) {
  throw "Blender executable not found: $Blender"
}

foreach ($Job in $Jobs) {
  if ($Profiles.Count -gt 0 -and $Job.Profile -notin $Profiles) {
    continue
  }
  $Source = Join-Path $BlenderRoot $Job.Source
  $Output = Join-Path $StagingDir $Job.Profile
  if (Test-Path $Output) {
    Remove-Item -Recurse -Force $Output
  }
  New-Item -ItemType Directory -Force -Path $Output | Out-Null

  if ($Job.Generator) {
    $Generator = Join-Path $BlenderRoot $Job.Generator
    & $Blender --background --python $Generator -- `
      --source $Source `
      --preview (Join-Path $Output "aegis_source_preview.png") `
      --contract (Join-Path $Output "geometry-contract.json")

    if ($LASTEXITCODE -ne 0) {
      throw "Blender generation failed for $($Job.Profile)"
    }
  }

  & $Blender $Source --background --python $Exporter -- `
    --profile $Job.Profile `
    --source $Source `
    --output-dir $Output

  if ($LASTEXITCODE -ne 0) {
    throw "Blender export failed for $($Job.Profile)"
  }
}

Write-Host "Astra Blender exports are ready in $StagingDir"
