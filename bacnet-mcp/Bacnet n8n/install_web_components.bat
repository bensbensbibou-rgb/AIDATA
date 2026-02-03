@echo off
echo ========================================
echo Installation des Composants Web - Windows
echo ========================================

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker n'est pas installe. Veuillez installer Docker Desktop depuis https://docker.com
    echo Puis relancez ce script.
    pause
    exit /b 1
)

echo Docker detecte:
docker --version

echo.
echo ========================================
echo Installation des composants web...
echo ========================================

REM Créer les dossiers nécessaires
if not exist "monitoring" mkdir monitoring
if not exist "monitoring\prometheus" mkdir monitoring\prometheus
if not exist "monitoring\grafana" mkdir monitoring\grafana
if not exist "monitoring\nginx" mkdir monitoring\nginx

REM Copier les fichiers de configuration
copy "prometheus.yml" "monitoring\prometheus\prometheus.yml"
copy "nginx.conf" "monitoring\nginx\nginx.conf"

echo.
echo ========================================
echo Demarrage des services web...
echo ========================================

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
start "Nginx" cmd /k "docker run --name nginx-proxy -p 80:80 -p 443:443 -v %cd%\monitoring\nginx\nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine"

echo.
echo ========================================
echo Services web demarres avec succes!
echo ========================================
echo.
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3000 (admin/admin123)
echo Nginx: http://localhost:80
echo.
echo Les fenetres des services sont ouvertes dans des onglets separes.
echo Appuyez sur une touche pour fermer ce script...
pause
