@echo off
echo ========================================
echo DEMARRAGE AUTOMATIQUE COMPLET
echo BACnet MCP + n8n + Web + MCP Inspector
echo ========================================

REM Arrêter les processus existants
echo [1/6] Arret des processus existants...
taskkill /f /im python.exe 2>nul
taskkill /f /im node.exe 2>nul
docker stop n8n-local 2>nul

REM Attendre un peu
timeout /t 2 /nobreak >nul

echo.
echo [2/6] Demarrage du serveur BACnet MCP...
start "BACnet MCP Server" cmd /k "cd /d %cd% && venv\Scripts\activate.bat && python server.py"

REM Attendre que le serveur démarre
timeout /t 5 /nobreak >nul

echo.
echo [3/6] Demarrage de l'interface web...
start "Interface Web" cmd /k "cd /d %cd% && venv\Scripts\activate.bat && python serveurWeb.py"

REM Attendre un peu
timeout /t 3 /nobreak >nul

echo.
echo [4/6] Demarrage de n8n via Docker...
docker run -d --name n8n-local -p 5678:5678 --env-file n8n.env -v "%cd%\n8n-data:/home/node/.n8n" n8nio/n8n:latest

REM Attendre que n8n démarre
timeout /t 10 /nobreak >nul

echo.
echo [5/6] Demarrage des services web (Prometheus, Grafana, Nginx)...
docker run -d --name prometheus-monitoring -p 9090:9090 -v "%cd%\prometheus.yml:/etc/prometheus/prometheus.yml" prom/prometheus:latest
docker run -d --name grafana-dashboard -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana:latest
docker run -d --name nginx-proxy -p 80:80 -v "%cd%\nginx.conf:/etc/nginx/nginx.conf" nginx:alpine

REM Attendre que les services démarrent
timeout /t 5 /nobreak >nul

echo.
echo [6/6] Demarrage de l'inspecteur MCP...
start "MCP Inspector" cmd /k "npx @modelcontextprotocol/inspector@0.13.0"

echo.
echo ========================================
echo DEMARRAGE TERMINE AVEC SUCCES!
echo ========================================
echo.
echo Services disponibles:
echo - Serveur BACnet MCP: http://localhost:8050/mcp/
echo - Interface Web: http://localhost:8080
echo - n8n: http://localhost:5678
echo - MCP Inspector: http://localhost:6274
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3000
echo - Nginx Proxy: http://localhost:80
echo.
echo Tous les services sont maintenant actifs!
echo Appuyez sur une touche pour fermer cette fenetre...
pause
