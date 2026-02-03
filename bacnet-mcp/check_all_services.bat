@echo off
echo ========================================
echo VERIFICATION DE L'ETAT DES SERVICES
echo BACnet MCP + n8n + Web + MCP Inspector
echo ========================================

echo.
echo [1/7] Verification des processus Python...
tasklist | findstr "python.exe" >nul
if errorlevel 1 (
    echo ❌ Aucun processus Python actif
) else (
    echo ✅ Processus Python actifs
    tasklist | findstr "python.exe"
)

echo.
echo [2/7] Verification des processus Node.js...
tasklist | findstr "node.exe" >nul
if errorlevel 1 (
    echo ❌ Aucun processus Node.js actif
) else (
    echo ✅ Processus Node.js actifs
    tasklist | findstr "node.exe"
)

echo.
echo [3/7] Verification des conteneurs Docker...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr "n8n-local\|prometheus\|grafana\|nginx"

echo.
echo [4/7] Verification du port 8050 (BACnet MCP)...
netstat -an | findstr ":8050" >nul
if errorlevel 1 (
    echo ❌ Port 8050 non actif
) else (
    echo ✅ Port 8050 actif - BACnet MCP Server
)

echo.
echo [5/7] Verification du port 8080 (Interface Web)...
netstat -an | findstr ":8080" >nul
if errorlevel 1 (
    echo ❌ Port 8080 non actif
) else (
    echo ✅ Port 8080 actif - Interface Web
)

echo.
echo [6/7] Verification du port 5678 (n8n)...
netstat -an | findstr ":5678" >nul
if errorlevel 1 (
    echo ❌ Port 5678 non actif
) else (
    echo ✅ Port 5678 actif - n8n
)

echo.
echo [7/7] Verification du port 6274 (MCP Inspector)...
netstat -an | findstr ":6274" >nul
if errorlevel 1 (
    echo ❌ Port 6274 non actif
) else (
    echo ✅ Port 6274 actif - MCP Inspector
)

echo.
echo ========================================
echo RESUME DES SERVICES
echo ========================================
echo.
echo URLs d'acces:
echo - BACnet MCP: http://localhost:8050/mcp/
echo - Interface Web: http://localhost:8080
echo - n8n: http://localhost:5678
echo - MCP Inspector: http://localhost:6274
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3000
echo.
echo Pour demarrer tous les services: start_all_automatic.bat
echo Pour arreter tous les services: stop_all_services.bat
echo.
pause
