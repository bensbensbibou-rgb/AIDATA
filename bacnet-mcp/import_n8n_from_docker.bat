@echo off
echo ========================================
echo Import des donnees n8n depuis Docker
echo ========================================

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker n'est pas installe. Veuillez installer Docker Desktop depuis https://docker.com
    pause
    exit /b 1
)

echo.
echo Cette operation va:
echo 1. Copier les donnees n8n depuis le conteneur Docker
echo 2. Les placer dans le dossier local n8n-data
echo 3. Permettre a n8n local d'utiliser ces donnees
echo.

set /p confirm="Voulez-vous continuer? (o/n): "
if /i not "%confirm%"=="o" (
    echo Operation annulee.
    pause
    exit /b 0
)

echo.
echo ========================================
echo 1. Recherche du conteneur n8n Docker...
echo ========================================

REM Chercher le conteneur n8n
docker ps -a | findstr n8n
if errorlevel 1 (
    echo Aucun conteneur n8n trouve.
    echo Veuillez d'abord demarrer n8n dans Docker.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 2. Copie des donnees depuis Docker...
echo ========================================

REM Créer le dossier de destination s'il n'existe pas
if not exist "n8n-data" mkdir n8n-data

REM Copier les données depuis le conteneur Docker
echo Copie des workflows...
docker cp n8n:/home/node/.n8n/workflows.json n8n-data\ 2>nul
if errorlevel 1 (
    echo Aucun workflow trouve dans le conteneur Docker.
)

echo Copie des credentials...
docker cp n8n:/home/node/.n8n/credentials.json n8n-data\ 2>nul
if errorlevel 1 (
    echo Aucun credential trouve dans le conteneur Docker.
)

echo Copie de la base de donnees...
docker cp n8n:/home/node/.n8n/database.sqlite n8n-data\ 2>nul
if errorlevel 1 (
    echo Aucune base de donnees trouvee dans le conteneur Docker.
)

echo.
echo ========================================
echo 3. Verification des fichiers copies...
echo ========================================

echo Fichiers dans n8n-data:
dir n8n-data\*.json 2>nul
dir n8n-data\*.sqlite 2>nul

echo.
echo ========================================
echo Import termine!
echo ========================================
echo.
echo Pour utiliser n8n avec ces donnees:
echo 1. Utilisez start_n8n_local.bat
echo 2. Ou start_all_with_web_interface.bat
echo.
echo Interface n8n: http://localhost:5678
echo.

pause
