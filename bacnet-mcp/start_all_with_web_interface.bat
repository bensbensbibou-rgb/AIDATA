@echo off
echo ========================================
echo Demarrage BACnet MCP + n8n + Web + Interface
echo ========================================

REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo Python n'est pas installe. Veuillez installer Python 3.11+ depuis https://python.org
    pause
    exit /b 1
)

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe. Veuillez installer Node.js 18+ depuis https://nodejs.org
    pause
    exit /b 1
)

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker n'est pas installe. Veuillez installer Docker Desktop depuis https://docker.com
    pause
    exit /b 1
)

echo.
echo ========================================
echo 1. Demarrage du serveur BACnet MCP...
echo ========================================

REM Activer l'environnement virtuel et démarrer le serveur BACnet
start "BACnet MCP Server" cmd /k "venv\Scripts\activate.bat && python server.py"

REM Attendre un peu pour que le serveur démarre
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo 2. Demarrage de n8n...
echo ========================================

REM Démarrer n8n avec données locales
start "n8n Automation" cmd /k "start_n8n_local.bat"

REM Attendre un peu
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo 3. Demarrage du serveur web interface...
echo ========================================

REM Démarrer le serveur web pour les pages statiques
start "BACnet Web Interface" cmd /k "venv\Scripts\activate.bat && python serveurWeb.py"

REM Attendre un peu
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo 4. Demarrage des services web...
echo ========================================

REM Créer les dossiers nécessaires
if not exist "monitoring" mkdir monitoring
if not exist "monitoring\prometheus" mkdir monitoring\prometheus
if not exist "monitoring\grafana" mkdir monitoring\grafana
if not exist "monitoring\nginx" mkdir monitoring\nginx

REM Copier les fichiers de configuration
copy "prometheus_bacnet.yml" "monitoring\prometheus\prometheus.yml" >nul 2>&1
copy "nginx_bacnet.conf" "monitoring\nginx\nginx.conf" >nul 2>&1

REM Démarrer Prometheus
echo Demarrage de Prometheus...
start "Prometheus" cmd /k "docker run --name prometheus-monitoring -p 9090:9090 -v %cd%\monitoring\prometheus\prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus:latest"

REM Attendre un peu
timeout /t 3 /nobreak >nul

REM Démarrer Grafana
echo Demarrage de Grafana...
start "Grafana" cmd /k "docker run --name grafana-dashboard -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin123 grafana/grafana:latest"

REM Attendre un peu
timeout /t 3 /nobreak >nul

REM Démarrer Nginx
echo Demarrage de Nginx...
start "Nginx" cmd /k "docker run --name nginx-proxy -p 80:80 -v %cd%\monitoring\nginx\nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine"

echo.
echo ========================================
echo Tous les services demarres avec succes!
echo ========================================
echo.
echo Serveur BACnet MCP: http://localhost:8050
echo Interface n8n: http://localhost:5678
echo Interface Web BACnet: http://localhost:8080
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3000 (admin/admin123)
echo Nginx: http://localhost:80
echo.
echo Applications Web:
echo - Chat AI 24/7: http://localhost:8080/static/app.html
echo - Interface BACnet: http://localhost:8080/static/app1.html
echo.
echo Les fenetres des services sont ouvertes dans des onglets separes.
echo Appuyez sur une touche pour fermer ce script...
pause
