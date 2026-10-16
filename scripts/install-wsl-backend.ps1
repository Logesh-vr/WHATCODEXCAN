$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskScript = Join-Path $PSScriptRoot 'install-wsl-backend.sh'
$taskLinuxRoot = (& wsl.exe -e wslpath -a $taskRoot).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Install WSL Ubuntu first, launch it once, then retry.' }
$taskLinuxScript = (& wsl.exe -e wslpath -a $taskScript).Trim()
& wsl.exe --cd $taskLinuxRoot -u root -e bash $taskLinuxScript
if ($LASTEXITCODE -ne 0) { throw 'Backend runtime installation failed. Resolve the reported error and run this script again.' }
