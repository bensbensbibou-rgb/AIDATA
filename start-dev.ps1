$ErrorActionPreference = 'SilentlyContinue'

function Stop-PortProcess {
  param([int]$Port)
  $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique
    foreach ($pid in $pids) {
      try {
        Write-Host "Killing process $pid on port $Port" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
      } catch {}
    }
  }
}

# Libère les ports API/Front avant de lancer (ajout 3004/3005 au cas où)
foreach ($p in 4100,3000,3001,3002,3003,3004,3005) { Stop-PortProcess -Port $p }

Write-Host "Starting API + Front (dev:full)..." -ForegroundColor Cyan
npm run dev:full
