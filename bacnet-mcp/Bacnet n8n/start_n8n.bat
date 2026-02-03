@echo off
echo ========================================
echo Demarrage de n8n - Automatisation BACnet
echo ========================================

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe. Veuillez installer Node.js 18+ depuis https://nodejs.org
    echo Puis relancez ce script.
    pause
    exit /b 1
)

echo Node.js detecte:
node --version

REM Vérifier si n8n est installé
n8n --version >nul 2>&1
if errorlevel 1 (
    echo n8n n'est pas installe. Installation en cours...
    npm install -g n8n
)

echo n8n detecte:
n8n --version

echo.
echo Demarrage de n8n...
echo Interface n8n: http://localhost:5678
echo Webhook URL: http://localhost:5678/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat
echo.
echo Appuyez sur Ctrl+C pour arreter n8n
echo.

REM Démarrer n8n
n8n start --port 5678
