$env:Path = "C:\Program Files\nodejs;" + $env:Path
Write-Host "Starting Base Poker DApp..."

# Start Backend
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "dist/src/index.js" -WorkingDirectory "backend" -NoNewWindow
Write-Host "Backend started on port 3001"

# Start Frontend
Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" -ArgumentList "run dev" -WorkingDirectory "frontend" -NoNewWindow
Write-Host "Frontend started on port 3000"

Write-Host "Services are running. Press Ctrl+C to stop (might need to kill processes manually)."
