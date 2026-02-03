@echo off
echo Démarrage de n8n en local...

REM Activation de l'environnement virtuel Python si nécessaire
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Configuration des variables d'environnement pour n8n
set N8N_BASIC_AUTH_ACTIVE=true
set N8N_BASIC_AUTH_USER=admin
set N8N_BASIC_AUTH_PASSWORD=Admin123
set N8N_HOST=localhost
set N8N_PORT=5678
set N8N_PROTOCOL=http
set WEBHOOK_URL=http://localhost:5678
set N8N_USER_FOLDER=%CD%\n8n-data
set N8N_SKIP_OWNER_SETUP=false
set N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
set DB_SQLITE_POOL_SIZE=1
set N8N_RUNNERS_ENABLED=true
set N8N_DISABLE_TELEMETRY=true
set N8N_DISABLE_ANALYTICS=true
set N8N_DISABLE_PERSONALIZATION=false
set N8N_DISABLE_CREDENTIALS_ENCRYPTION=false
set N8N_DISABLE_WEBHOOK_ACCESS=false
set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
set N8N_ENCRYPTION_KEY=metIciUneCleTresLongueEtAleatoire_32+car
set GENERIC_TIMEZONE=Europe/Paris

REM Création du dossier de données n8n
if not exist "n8n-data" mkdir n8n-data

REM Démarrage de n8n
echo Configuration terminée. Démarrage de n8n sur http://localhost:5678
echo Utilisateur: admin
echo Mot de passe: Admin123
echo.

REM Essayer d'abord npx n8n, puis le local si installé
npx n8n start 2>nul || node_modules\.bin\n8n.cmd start 2>nul || n8n start

pause

