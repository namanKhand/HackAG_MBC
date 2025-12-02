$env:Path = "C:\Program Files\nodejs;" + $env:Path
Write-Host "Starting Base Poker DApp (Full Stack)..."

# 1. Start Hardhat Node
Write-Host "Starting Hardhat Node..."
$nodeProcess = Start-Process -FilePath "npx.cmd" -ArgumentList "hardhat node" -WorkingDirectory "contracts" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

# 2. Deploy Contracts
Write-Host "Deploying Contracts..."
Push-Location "contracts"
try {
    cmd /c "npx hardhat run scripts/deploy.js --network localhost"
}
finally {
    Pop-Location
}

# 3. Start Backend
Write-Host "Starting Backend..."
# Use npm run dev to ensure ts-node is used correctly
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "backend" -NoNewWindow

# 4. Start Frontend
Write-Host "Starting Frontend..."
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "frontend" -NoNewWindow

Write-Host "All services are running."
Write-Host "Hardhat Node PID: $($nodeProcess.Id)"
Write-Host "Press Ctrl+C to stop (processes may need manual cleanup)."
