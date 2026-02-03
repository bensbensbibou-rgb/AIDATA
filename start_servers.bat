@echo off
echo Starting BACnet Server on port 8000...
start "BACnet Server" cmd /k "python server_bacnet.py"

echo Starting Distech Server on port 8001...
start "Distech Server" cmd /k "python server.py"

echo Starting Frontend...
start "Frontend" cmd /k "npm run dev"

echo All services are starting...
echo BACnet: http://localhost:8000/docs
echo Distech: http://localhost:8001/docs
echo Frontend: http://localhost:3000
