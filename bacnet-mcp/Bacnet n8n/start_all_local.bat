@echo off
echo ========================================
echo Demarrage BACnet MCP + n8n - Local
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

REM Démarrer n8n
start "n8n Automation" cmd /k "n8n start --port 5678"

echo.
echo ========================================
echo Services demarres avec succes!
echo ========================================
echo.
echo Serveur BACnet MCP: http://localhost:8050
echo Interface n8n: http://localhost:5678
echo.
echo Les fenetres des services sont ouvertes dans des onglets separes.
echo Appuyez sur une touche pour fermer ce script...
pause
