@echo off
echo ========================================
echo   Demarrage de tous les services
echo   Dashboard Energy Portal
echo ========================================
echo.

REM Demarrer le broker MQTT (Docker)
echo [1/5] Verification du broker MQTT...
docker ps | findstr mosquitto >nul
if %errorLevel% == 0 (
    echo [OK] Mosquitto est deja en cours d'execution
) else (
    echo Demarrage de Mosquitto...
    docker start mosquitto
    if %errorLevel% neq 0 (
        echo Creation du conteneur Mosquitto...
        docker run -d --name mosquitto -p 1883:1883 -p 9001:9001 eclipse-mosquitto
    )
)

REM Demarrer BACnet Server
echo.
echo [2/5] Demarrage du serveur BACnet (port 8000)...
start "BACnet Server" cmd /k "python server_bacnet.py"

REM Demarrer Distech Server
echo.
echo [3/5] Demarrage du serveur Distech (port 8001)...
start "Distech Server" cmd /k "python server.py"

REM Demarrer MQTT MCP Server (si Python 3.13 disponible)
echo.
echo [4/5] Demarrage du serveur MQTT MCP (port 8002)...
py -3.13 --version >nul 2>&1
if %errorLevel% == 0 (
    start "MQTT MCP Server" cmd /k "cd mqtt-mcp-main\mqtt-mcp-main && py -3.13 -m venv venv_mqtt && .\venv_mqtt\Scripts\activate && mqtt-mcp"
) else (
    echo [SKIP] Python 3.13 non installe - serveur MQTT MCP non demarre
    echo        Voir INSTALL_PYTHON313_MQTT_MCP.md pour l'installation
)

REM Demarrer Frontend
echo.
echo [5/5] Demarrage du frontend React (port 3000)...
start "Frontend Dashboard" cmd /k "npm run dev"

echo.
echo ========================================
echo   Tous les services sont lances !
echo ========================================
echo.
echo Services disponibles :
echo   Frontend:     http://localhost:3000
echo   BACnet API:   http://localhost:8000/docs
echo   Distech API:  http://localhost:8001/docs
echo   MQTT MCP:     http://localhost:8002/mcp/ (si Python 3.13)
echo   Mosquitto:    mqtt://localhost:1883
echo   n8n:          http://localhost:5678
echo.
echo Pour arreter tous les services, fermez les fenetres de terminal.
echo.
pause
