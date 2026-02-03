@echo off
echo ========================================
echo DEMARRAGE N8N FINAL - AVEC DONNEES
echo ========================================

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe. Veuillez installer Node.js 18+ depuis https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Configuration n8n:
echo - Dossier de donnees: %cd%\n8n-data
echo - Port: 5678
echo - Interface: http://localhost:5678
echo - Status: ✅ Données Docker importées et rechiffrées
echo.

echo.
echo Démarrage de n8n...
n8n start --port 5678 --user-folder "%cd%\n8n-data"

pause

