@echo off
echo ========================================
echo REPARATION COMPLETE DE N8N
echo ========================================

echo.
echo 1. Arret de tous les processus...
echo.

REM Arrêter tous les processus node
taskkill /f /im node.exe 2>nul

echo.
echo 2. Verification Docker...
echo.

REM Démarrer le conteneur n8n si nécessaire
docker ps -a | findstr "n8n-automation" >nul
if errorlevel 1 (
    echo Conteneur n8n-automation non trouve
    goto :start_docker
)

docker start n8n-automation 2>nul
if errorlevel 1 (
    echo Erreur demarrage conteneur
    goto :start_docker
)

goto :export_data

:start_docker
echo.
echo 3. Demarrage Docker Compose...
echo.
docker-compose up -d n8n-automation
timeout /t 10 /nobreak >nul

:export_data
echo.
echo 4. Export des donnees depuis Docker...
echo.

REM Export workflows
docker exec n8n-automation n8n export:workflow --all --output=/tmp/flows.json
docker cp n8n-automation:/tmp/flows.json ./flows.json

REM Export credentials
docker exec n8n-automation n8n export:credentials --all --decrypted --output=/tmp/creds.json
docker cp n8n-automation:/tmp/creds.json ./creds.json

echo.
echo 5. Creation dossier n8n-data propre...
echo.

REM Supprimer l'ancien dossier
rd /s /q n8n-data 2>nul
mkdir n8n-data

echo.
echo 6. Import des donnees dans n8n local...
echo.

REM Import workflows
n8n import:workflow --input=flows.json --user-folder=%cd%\n8n-data

REM Import credentials
n8n import:credentials --input=creds.json --user-folder=%cd%\n8n-data

echo.
echo 7. Demarrage de n8n...
echo.

REM Démarrer n8n
start "n8n Local" cmd /c "n8n start --port 5678 --user-folder=%cd%\n8n-data"

echo.
echo ========================================
echo ATTENTE DU DEMARRAGE...
echo ========================================
echo.

timeout /t 15 /nobreak >nul

REM Vérifier si n8n est accessible
curl -s http://localhost:5678 >nul
if errorlevel 1 (
    echo ERREUR: n8n ne repond pas
    goto :end
)

echo.
echo ========================================
echo SUCCES ! N8N EST OPERATIONNEL
echo ========================================
echo.
echo Accedez a: http://localhost:5678
echo.
echo Identifiants:
echo - Email: mr-bensalem@hotmail.com
echo - Mot de passe: Bensalem01!
echo.

goto :end

:end
echo.
echo ========================================
echo FIN DE LA REPARATION
echo ========================================
echo.
pause

