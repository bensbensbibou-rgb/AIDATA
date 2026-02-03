@echo off
echo ========================================
echo Demarrage n8n avec donnees Docker (sans setup)
echo ========================================

echo.
echo Configuration:
echo - Dossier: %cd%\n8n-data
echo - Port: 5678
echo - Interface: http://localhost:5678
echo.

REM Définir les variables d'environnement
set N8N_USER_FOLDER=%cd%\n8n-data
set N8N_BASIC_AUTH_ACTIVE=false
set N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
set N8N_ENCRYPTION_KEY=your-secret-key-here

echo Dossier n8n: %N8N_USER_FOLDER%

echo.
echo ========================================
echo Demarrage de n8n...
echo ========================================

REM Démarrer n8n avec les données Docker
n8n start --port 5678 --user-folder "%cd%\n8n-data" --tunnel

pause
