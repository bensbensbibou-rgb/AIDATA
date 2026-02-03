@echo off
echo ========================================
echo DEMARRAGE COMPLET EN LOCAL (SANS DOCKER)
echo BACnet MCP + n8n + Web + MCP Inspector
echo ========================================

REM Vérifier si l'environnement virtuel existe
if not exist "venv\Scripts\activate.bat" (
    echo ❌ Environnement virtuel non trouve. Creation...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Erreur lors de la creation de l'environnement virtuel
        pause
        exit /b 1
    )
)

REM Activer l'environnement virtuel
echo [1/5] Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

REM Installer les dépendances si nécessaire
if not exist "venv\Lib\site-packages\fastapi" (
    echo [1.5/5] Installation des dependances Python...
    pip install -r requirements.txt
)

echo.
echo [2/5] Demarrage du serveur BACnet MCP...
start "BACnet MCP Server" cmd /k "cd /d %cd% && venv\Scripts\activate.bat && python server.py"

REM Attendre que le serveur démarre
timeout /t 5 /nobreak >nul

echo.
echo [3/5] Demarrage de l'interface web...
start "Interface Web" cmd /k "cd /d %cd% && venv\Scripts\activate.bat && python serveurWeb.py"

REM Attendre un peu
timeout /t 3 /nobreak >nul

echo.
echo [4/5] Demarrage de n8n en local...
start "n8n Local" cmd /k "cd /d %cd% && n8n start --port 5678 --user-folder %cd%\n8n-data"

REM Attendre que n8n démarre
timeout /t 10 /nobreak >nul

echo.
echo [5/5] Demarrage de l'inspecteur MCP...
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
echo.
echo Configuration n8n MCP Client:
echo - Server URL: http://localhost:8050/mcp/
echo - Headers: Accept: application/json, text/event-stream
echo - Content-Type: application/json
echo.
echo Tous les services sont maintenant actifs en local!
echo Appuyez sur une touche pour fermer cette fenetre...
pause
