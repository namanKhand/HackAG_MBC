#!/bin/bash

# Kill any existing processes on ports 8545, 3001, 3000
echo "Cleaning up ports..."
lsof -ti:8545 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start Hardhat Node
echo "Starting Hardhat Node..."
cd contracts
npx hardhat node > ../node.log 2>&1 &
NODE_PID=$!
echo "Hardhat Node started with PID $NODE_PID"

# Wait for node to start
sleep 5

# Deploy Contracts
echo "Deploying Contracts..."
npx hardhat run scripts/deploy.js --network localhost
cd ..

# Start Backend
echo "Starting Backend..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend
./node_modules/.bin/next dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"
cd ..

echo "All services started!"
echo "Hardhat Node: PID $NODE_PID (Logs: node.log)"
echo "Backend: PID $BACKEND_PID (Logs: backend.log)"
echo "Frontend: PID $FRONTEND_PID (Logs: frontend.log)"
echo "Press CTRL+C to stop all services."

# Trap CTRL+C to kill all background processes
trap "kill $NODE_PID $BACKEND_PID $FRONTEND_PID; exit" INT

wait
