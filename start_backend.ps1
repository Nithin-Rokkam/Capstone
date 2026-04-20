param(
    [int]$Port = 8001
)

try {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
} catch {
    $listener = $null
}
if ($listener) {
    Stop-Process -Id $listener.OwningProcess -Force
}

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
Set-Location $PSScriptRoot
& $python main.py