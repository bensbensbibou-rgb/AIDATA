@echo off
echo ========================================
echo Installation BACnet MCP Server - Windows
echo ========================================

REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo Python n'est pas installé. Veuillez installer Python 3.11+ depuis https://python.org
    echo Puis relancez ce script.
    pause
    exit /b 1
)

echo Python detecte: 
python --version

REM Créer un environnement virtuel
echo.
echo Creation de l'environnement virtuel...
python -m venv venv

REM Activer l'environnement virtuel
echo.
echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

REM Mettre à jour pip
echo.
echo Mise a jour de pip...
python -m pip install --upgrade pip

REM Installer les dépendances
echo.
echo Installation des dependances...
pip install -r requirements.txt

REM Créer les dossiers nécessaires
echo.
echo Creation des dossiers...
if not exist "data" mkdir data
if not exist "static" mkdir static
if not exist "logs" mkdir logs

REM Copier le fichier de configuration exemple
echo.
echo Configuration...
if not exist ".env" (
    copy config.env.example .env
    echo Fichier .env cree. Veuillez le configurer selon vos besoins.
)

echo.
echo ========================================
echo Installation terminee avec succes!
echo ========================================
echo.
echo Pour demarrer le serveur:
echo 1. Activez l'environnement virtuel: venv\Scripts\activate.bat
echo 2. Lancez le serveur: python server.py
echo.
echo Interface web: http://localhost:8050
echo Serveur MCP: http://localhost:8050/mcp/
echo.
pause
