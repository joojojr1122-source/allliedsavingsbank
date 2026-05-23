$BundledNode = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerFile = Join-Path $ProjectRoot "backend\src\server.js"
$OutLogFile = Join-Path $ProjectRoot "server.out.log"
$ErrLogFile = Join-Path $ProjectRoot "server.err.log"

if (Test-Path $BundledNode) {
  $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
  $ProcessInfo.FileName = $BundledNode
  $ProcessInfo.Arguments = "`"$ServerFile`""
  $ProcessInfo.WorkingDirectory = $ProjectRoot
  $ProcessInfo.UseShellExecute = $false
  $ProcessInfo.CreateNoWindow = $true
  $ProcessInfo.RedirectStandardOutput = $true
  $ProcessInfo.RedirectStandardError = $true

  $Process = New-Object System.Diagnostics.Process
  $Process.StartInfo = $ProcessInfo
  $Process.Start() | Out-Null

  Write-Host "Server starting at http://localhost:3000"
  Write-Host "Log files: $OutLogFile and $ErrLogFile"
  exit 0
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
  $ProcessInfo.FileName = "node"
  $ProcessInfo.Arguments = "`"$ServerFile`""
  $ProcessInfo.WorkingDirectory = $ProjectRoot
  $ProcessInfo.UseShellExecute = $false
  $ProcessInfo.CreateNoWindow = $true
  $ProcessInfo.RedirectStandardOutput = $true
  $ProcessInfo.RedirectStandardError = $true

  $Process = New-Object System.Diagnostics.Process
  $Process.StartInfo = $ProcessInfo
  $Process.Start() | Out-Null

  Write-Host "Server starting at http://localhost:3000"
  Write-Host "Log files: $OutLogFile and $ErrLogFile"
  exit 0
}

Write-Host "Node.js was not found."
Write-Host "Install Node.js LTS from https://nodejs.org/ or run .\start-app.ps1 from Codex where bundled Node is available."
exit 1
