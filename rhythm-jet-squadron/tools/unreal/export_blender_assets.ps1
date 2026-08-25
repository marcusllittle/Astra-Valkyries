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
    "aegis-boss",
    "cryo-boss",
    "helios-boss",
    "enemy-fleet",
    "claude-models"
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
  },
  @{
    Profile = "cryo-boss"
    Source = "astra_cryo_leviathan.blend"
    Generator = "generate_cryo_leviathan.py"
  },
  @{
    Profile = "helios-boss"
    Source = "astra_helios_tyrant.blend"
    Generator = "generate_helios_tyrant.py"
  },
  @{
    Profile = "enemy-fleet"
    Source = "astra_enemy_fleet.blend"
    Generator = "generate_enemy_fleet.py"
  },
  @{
    Profile = "claude-models"
    Source = "astra_claude_model_library.blend"
    Generator = "generate_claude_model_library.py"
    SourceDir = "imports\claude-models"
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
    $GeneratorArgs = @(
      "--background",
      "--python-exit-code", "1",
      "--python", $Generator,
      "--",
      "--source", $Source,
      "--contract", (Join-Path $Output "geometry-contract.json")
    )
    if ($Job.SourceDir) {
      $GeneratorArgs += @("--source-dir", (Join-Path $BlenderRoot $Job.SourceDir))
    } else {
      $GeneratorArgs += @("--preview", (Join-Path $Output "$($Job.Profile)_source_preview.png"))
    }
    $GeneratorProcess = Start-Process -FilePath $Blender -ArgumentList $GeneratorArgs -Wait -PassThru
    if ($GeneratorProcess.ExitCode -ne 0) {
      throw "Blender generation failed for $($Job.Profile)"
    }
  }

  $ExportArgs = @(
    $Source,
    "--background",
    "--python-exit-code", "1",
    "--python", $Exporter,
    "--",
    "--profile", $Job.Profile,
    "--source", $Source,
    "--output-dir", $Output
  )
  $ExportProcess = Start-Process -FilePath $Blender -ArgumentList $ExportArgs -Wait -PassThru
  if ($ExportProcess.ExitCode -ne 0) {
    throw "Blender export failed for $($Job.Profile)"
  }
}

Write-Host "Astra Blender exports are ready in $StagingDir"
