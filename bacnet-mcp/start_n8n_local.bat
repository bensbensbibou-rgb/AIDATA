@echo off
echo ========================================
echo Demarrage n8n avec donnees locales
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
echo.

REM Démarrer n8n avec le dossier de données local
set N8N_USER_FOLDER=%cd%\n8n-data
set N8N_ENCRYPTION_KEY=cleTresLongueEtAleatoirePourN8n_32caracteres
echo Dossier n8n: %N8N_USER_FOLDER%

echo.
echo Demarrage de n8n...
n8n start --port 5678 --user-folder "%cd%\n8n-data"

pause
