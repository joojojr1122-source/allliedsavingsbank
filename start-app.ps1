$BundledNode = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerFile = Join-Path $ProjectRoot "backend\src\server.js"

if (Test-Path $BundledNode) {
  & $BundledNode $ServerFile
  exit $LASTEXITCODE
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  node $ServerFile
  exit $LASTEXITCODE
}

Write-Host "Node.js was not found."
Write-Host "Install Node.js LTS from https://nodejs.org/ or run this project from Codex where bundled Node is available."
exit 1
