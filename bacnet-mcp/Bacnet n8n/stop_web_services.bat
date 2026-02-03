@echo off
echo ========================================
echo Arret des Services Web - Windows
echo ========================================

echo Arret de Prometheus...
docker stop prometheus-monitoring 2>nul
docker rm prometheus-monitoring 2>nul

echo Arret de Grafana...
docker stop grafana-dashboard 2>nul
docker rm grafana-dashboard 2>nul

echo Arret de Nginx...
docker stop nginx-proxy 2>nul
docker rm nginx-proxy 2>nul

echo.
echo ========================================
echo Services web arretes avec succes!
echo ========================================
echo.
echo Pour redemarrer les services web:
echo install_web_components.bat
echo.
pause
