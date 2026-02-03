@echo off
echo ========================================
echo    BACnet MCP avec n8n - Démarrage
echo ========================================
echo.

echo [1/4] Arrêt des processus n8n locaux...
taskkill /F /IM n8n.exe 2>nul
echo.

echo [2/4] Arrêt des conteneurs Docker existants...
docker-compose down
echo.

echo [3/4] Démarrage de tous les services...
docker-compose up -d
echo.

echo [4/4] Vérification des services...
timeout /t 10 /nobreak >nul
python check_services.py
echo.

echo ========================================
echo    Services disponibles :
echo ========================================
echo.
echo 🌐 n8n: http://localhost:5678
echo 🔧 Serveur MCP: http://localhost:8000
echo 📊 Grafana: http://localhost:3000
echo 📈 Prometheus: http://localhost:9090
echo 🗄️ Adminer: http://localhost:8080
echo.
echo Appuyez sur une touche pour ouvrir n8n...
pause >nul
start http://localhost:5678
