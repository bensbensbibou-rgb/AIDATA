@echo off
echo ========================================
echo ARRET DE TOUS LES SERVICES
echo BACnet MCP + n8n + Web + MCP Inspector
echo ========================================

echo.
echo [1/4] Arret des processus Python...
taskkill /f /im python.exe 2>nul
if errorlevel 1 (
    echo Aucun processus Python trouve.
) else (
    echo Processus Python arretes.
)

echo.
echo [2/4] Arret des processus Node.js...
taskkill /f /im node.exe 2>nul
if errorlevel 1 (
    echo Aucun processus Node.js trouve.
) else (
    echo Processus Node.js arretes.
)

echo.
echo [3/4] Arret des conteneurs Docker...
docker stop n8n-local 2>nul
docker stop prometheus-monitoring 2>nul
docker stop grafana-dashboard 2>nul
docker stop nginx-proxy 2>nul

echo Conteneurs Docker arretes.

echo.
echo [4/4] Fermeture des fenetres de commande...
taskkill /f /fi "WINDOWTITLE eq BACnet MCP Server*" 2>nul
taskkill /f /fi "WINDOWTITLE eq Interface Web*" 2>nul
taskkill /f /fi "WINDOWTITLE eq MCP Inspector*" 2>nul

echo.
echo ========================================
echo ARRET TERMINE!
echo ========================================
echo.
echo Tous les services ont ete arretes.
echo.
echo Pour redemarrer, utilisez: start_all_automatic.bat
echo.
pause
