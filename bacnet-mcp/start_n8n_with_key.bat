@echo off
echo ========================================
echo DEMARRAGE N8N AVEC CLE DE CHIFFREMENT
echo ========================================

REM Activer l'environnement virtuel
call venv\Scripts\activate.bat

REM Définir les variables d'environnement pour n8n
set N8N_RUNNERS_ENABLED=true
set N8N_BASIC_AUTH_ACTIVE=true
set N8N_BASIC_AUTH_USER=admin
set N8N_BASIC_AUTH_PASSWORD=Admin123
set N8N_HOST=localhost
set N8N_PORT=5678
set N8N_PROTOCOL=http
set WEBHOOK_URL=http://localhost:5678
set N8N_USER_FOLDER=n8n-data
set N8N_SKIP_OWNER_SETUP=false
set N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
set DB_SQLITE_POOL_SIZE=1
set N8N_DISABLE_TELEMETRY=true
set N8N_DISABLE_ANALYTICS=true
set N8N_DISABLE_PERSONALIZATION=false
set N8N_DISABLE_CREDENTIALS_ENCRYPTION=false
set N8N_DISABLE_WEBHOOK_ACCESS=false
set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
set N8N_ENCRYPTION_KEY=metIciUneCleTresLongueEtAleatoire_32+car
set GENERIC_TIMEZONE=Europe/Paris

REM Configuration MCP pour BACnet
set N8N_MCP_SERVER_URL=http://localhost:8050/mcp/
set N8N_MCP_SERVER_NAME=BACnet MCP Server
set N8N_MCP_SERVER_VERSION=1.4.2

echo.
echo Variables d'environnement configurees
echo Cle de chiffrement: %N8N_ENCRYPTION_KEY%
echo Demarrage de n8n...

REM Démarrer n8n avec les variables d'environnement
n8n start --port 5678 --user-folder n8n-data

echo.
echo ========================================
echo N8N DEMARRE AVEC CLE DE CHIFFREMENT!
echo ========================================
echo.
echo URL: http://localhost:5678
echo Utilisateur: admin
echo Mot de passe: Admin123
echo.
echo Configuration MCP:
echo - Server URL: http://localhost:8050/mcp/
echo.
echo Task Runners: ENABLES
echo Cle de chiffrement: ACTIVE
echo.
pause
