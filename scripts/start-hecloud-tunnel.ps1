param(
  [int]$LocalPort = 5173,
  [int]$RemotePort = 5173,
  [string]$SshInfoPath = "",
  [string]$SshHost = "",
  [string]$SshUser = "",
  [int]$SshPort = 0,
  [string]$KeyPath = "",
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}

function Write-TunnelLog {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $script:LogPath -Value "[$timestamp] $Message"
}

function Read-SshInfo {
  param([string]$Path)

  $lines = Get-Content -LiteralPath $Path | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  $hostLine = $lines | Where-Object { $_ -match "^(\d{1,3}\.){3}\d{1,3}$" } | Select-Object -First 1
  if (-not $hostLine) {
    throw "Could not find IPv4 host in SSH info file: $Path"
  }

  $hostIndex = [Array]::IndexOf($lines, $hostLine)
  $userLine = if ($hostIndex + 2 -lt $lines.Count) { $lines[$hostIndex + 2] } else { "root" }
  $portLine = $lines | Where-Object { $_ -match "^\d{1,5}$" } | Select-Object -Last 1
  if (-not $portLine) {
    $portLine = "22"
  }

  return @{
    Host = $hostLine
    User = $userLine
    Port = $portLine
  }
}

$repoRoot = Resolve-RepoRoot
$logDir = Join-Path $repoRoot "output\tunnels"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$script:LogPath = Join-Path $logDir "hecloud-5173.log"

if (-not $KeyPath) {
  $KeyPath = if ($env:CODEXUI_HECLOUD_KEY_PATH) {
    $env:CODEXUI_HECLOUD_KEY_PATH
  } else {
    Join-Path $env:USERPROFILE ".ssh\codexui_hecloud_ed25519"
  }
}

if (-not $Foreground) {
  try {
    $existing = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
      Where-Object {
        $_.ProcessId -ne $PID -and
        $_.CommandLine -like "*start-hecloud-tunnel.ps1*" -and
        $_.CommandLine -like "*-Foreground*" -and
        $_.CommandLine -like "*-RemotePort $RemotePort*"
      } |
      Select-Object -First 1
    if ($existing) {
      Write-Host "Hecloud tunnel already running for remote port $RemotePort."
      exit 0
    }
  } catch {
    Write-TunnelLog "Could not check existing tunnel process: $($_.Exception.Message)"
  }

  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "`"$PSCommandPath`"",
    "-Foreground",
    "-LocalPort",
    "$LocalPort",
    "-RemotePort",
    "$RemotePort",
    "-SshHost",
    "$SshHost",
    "-SshUser",
    "$SshUser",
    "-SshPort",
    "$SshPort",
    "-KeyPath",
    "`"$KeyPath`""
  )
  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WindowStyle Hidden
  Write-Host "Hecloud tunnel starting in background. Log: $LogPath"
  exit 0
}

try {
  if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw "SSH key not found: $KeyPath"
  }

  if (-not $SshHost -and $env:CODEXUI_HECLOUD_HOST) {
    $SshHost = $env:CODEXUI_HECLOUD_HOST
  }
  if (-not $SshUser -and $env:CODEXUI_HECLOUD_USER) {
    $SshUser = $env:CODEXUI_HECLOUD_USER
  }
  if (-not $SshPort -and $env:CODEXUI_HECLOUD_SSH_PORT) {
    $SshPort = [int]$env:CODEXUI_HECLOUD_SSH_PORT
  }

  if ((-not $SshHost -or -not $SshUser -or -not $SshPort) -and $SshInfoPath -and (Test-Path -LiteralPath $SshInfoPath)) {
    $sshInfoFromFile = Read-SshInfo -Path $SshInfoPath
    if (-not $SshHost) {
      $SshHost = $sshInfoFromFile.Host
    }
    if (-not $SshUser) {
      $SshUser = $sshInfoFromFile.User
    }
    if (-not $SshPort) {
      $SshPort = [int]$sshInfoFromFile.Port
    }
  }

  if (-not $SshHost) {
    $SshHost = "38.76.162.141"
  }
  if (-not $SshUser) {
    $SshUser = "root"
  }
  if (-not $SshPort) {
    $SshPort = 22
  }

  $sshCommand = Get-Command ssh.exe -ErrorAction SilentlyContinue
  if (-not $sshCommand) {
    $sshCommand = Get-Command ssh -ErrorAction Stop
  }

  Write-TunnelLog "Starting reverse tunnel: ${SshHost}:$RemotePort -> 127.0.0.1:$LocalPort"
  $sshArgs = @(
    "-i", $KeyPath,
    "-p", "$SshPort",
    "-N",
    "-T",
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", "StrictHostKeyChecking=accept-new",
    "-R", "0.0.0.0:$RemotePort`:127.0.0.1:$LocalPort",
    "$SshUser@$SshHost"
  )

  & $sshCommand.Source @sshArgs *>> $LogPath
  Write-TunnelLog "Tunnel process exited with code $LASTEXITCODE"
  exit $LASTEXITCODE
} catch {
  Write-TunnelLog "Tunnel failed: $($_.Exception.Message)"
  exit 1
}
