@echo off
echo ========================================
echo Demarrage BACnet MCP + n8n (Docker Data) + Web Interface
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
echo 2. Demarrage de n8n (avec donnees Docker)...
echo ========================================

REM Démarrer n8n avec les données importées depuis Docker
start "n8n Automation (Docker Data)" cmd /k "start_n8n_local.bat"

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
echo Tous les services demarres avec succes!
echo ========================================
echo.
echo Serveur BACnet MCP: http://localhost:8050
echo Interface n8n (Docker Data): http://localhost:5678
echo Interface Web BACnet: http://localhost:8080
echo.
echo Applications Web:
echo - Chat AI 24/7: http://localhost:8080/static/app.html
echo - Interface BACnet: http://localhost:8080/static/app1.html
echo.
echo Les fenetres des services sont ouvertes dans des onglets separes.
echo Appuyez sur une touche pour fermer ce script...
pause
