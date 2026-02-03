@echo off
echo ========================================
echo Import direct des donnees n8n
echo ========================================

echo.
echo 1. Configuration de l'environnement...
echo.

set N8N_USER_FOLDER=C:\Users\naine\bacnet-mcp-venv\n8n-data
set N8N_ENCRYPTION_KEY=cleTresLongueEtAleatoirePourN8n_32caracteres

echo Configuration:
echo - Dossier: %N8N_USER_FOLDER%
echo - Clé d'encryption: %N8N_ENCRYPTION_KEY%
echo.

echo 2. Import des workflows...
echo.

REM Importer les workflows directement
n8n import:workflow --input=flows.json --user-folder=%N8N_USER_FOLDER%

echo.
echo 3. Import des credentials...
echo.

REM Importer les credentials directement
n8n import:credentials --input=creds.json --user-folder=%N8N_USER_FOLDER%

echo.
echo ========================================
echo Import termine !
echo ========================================
echo.
echo Vos workflows et credentials ont ete importes.
echo Vous pouvez maintenant lancer n8n avec:
echo   .\start_n8n_local.bat
echo.
pause
