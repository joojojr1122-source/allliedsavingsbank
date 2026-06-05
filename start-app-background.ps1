$BundledNode = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerFile = Join-Path $ProjectRoot "backend\src\server.js"
$OutLogFile = Join-Path $ProjectRoot "server.out.log"
$ErrLogFile = Join-Path $ProjectRoot "server.err.log"

function Start-BankPortalServer($NodeCommand) {
  $Command = "`"$NodeCommand`" `"$ServerFile`" > `"$OutLogFile`" 2> `"$ErrLogFile`""
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $Command -WorkingDirectory $ProjectRoot -WindowStyle Hidden
  Write-Host "Server starting at http://localhost:3000"
  Write-Host "Log files: $OutLogFile and $ErrLogFile"
}

if (Test-Path $BundledNode) {
  Start-BankPortalServer $BundledNode
  exit 0
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  Start-BankPortalServer "node"
  exit 0
}

Write-Host "Node.js was not found."
Write-Host "Install Node.js LTS from https://nodejs.org/ or run .\start-app.ps1 from Codex where bundled Node is available."
exit 1
