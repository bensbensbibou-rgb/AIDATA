@echo off
echo ========================================
echo    BACnet MCP avec n8n + MCP Inspector
echo ========================================
echo.

echo [1/5] Arrêt des processus n8n locaux...
taskkill /F /IM n8n.exe 2>nul
echo.

echo [2/5] Arrêt des conteneurs Docker existants...
docker-compose down
echo.

echo [3/5] Démarrage de tous les services Docker...
docker-compose up -d
echo.

echo [4/5] Démarrage de MCP Inspector...
start "MCP Inspector" cmd /c "start_mcp_inspector.bat"
echo.

echo [5/5] Vérification des services...
timeout /t 10 /nobreak >nul
python check_services.py
echo.

echo ========================================
echo    Services disponibles :
echo ========================================
echo.
echo 🌐 n8n: http://localhost:5678
echo 🔧 Serveur MCP: http://localhost:8000
echo 🔍 MCP Inspector: http://localhost:6274
echo 📊 Grafana: http://localhost:3000
echo 📈 Prometheus: http://localhost:9090
echo 🗄️ Adminer: http://localhost:8080
echo.
echo Appuyez sur une touche pour ouvrir n8n...
pause >nul
start http://localhost:5678

