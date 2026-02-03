@echo off
echo ========================================
echo Import des donnees n8n
echo ========================================

echo.
echo 1. Demarrage de n8n en mode temporaire...
echo.

REM Démarrer n8n avec le nouveau dossier de données
set N8N_USER_FOLDER=C:\Users\naine\bacnet-mcp-venv\n8n-data
set N8N_ENCRYPTION_KEY=cleTresLongueEtAleatoirePourN8n_32caracteres

echo Configuration:
echo - Dossier: %N8N_USER_FOLDER%
echo - Port: 5678
echo - Interface: http://localhost:5678
echo.

REM Démarrer n8n en arrière-plan
start "n8n Import" cmd /c "n8n start --user-folder=%N8N_USER_FOLDER% --port=5678"

echo Attente du demarrage de n8n...
timeout /t 15 /nobreak >nul

echo.
echo 2. Import des workflows...
echo.

REM Importer les workflows
curl -X POST "http://localhost:5678/rest/workflows" ^
  -H "Content-Type: application/json" ^
  -d @flows.json

echo.
echo 3. Import des credentials...
echo.

REM Importer les credentials
curl -X POST "http://localhost:5678/rest/credentials" ^
  -H "Content-Type: application/json" ^
  -d @creds.json

echo.
echo 4. Arret de n8n temporaire...
echo.

REM Arrêter n8n
taskkill /f /im node.exe

echo.
echo ========================================
echo Import termine !
echo ========================================
echo.
echo Vos workflows et credentials ont ete importes.
echo Vous pouvez maintenant lancer n8n normalement avec:
echo   .\start_n8n_local.bat
echo.
pause
