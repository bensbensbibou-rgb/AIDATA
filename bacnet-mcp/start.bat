@echo off
echo ========================================
echo Demarrage du serveur BACnet MCP
echo ========================================

REM Vérifier si l'environnement virtuel existe
if not exist "venv" (
    echo Environnement virtuel non trouve. Lancez d'abord install_windows.bat
    pause
    exit /b 1
)

REM Activer l'environnement virtuel
echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

REM Vérifier si les dépendances sont installées
python -c "import fastapi, fastmcp, bacpypes3" 2>nul
if errorlevel 1 (
    echo Dependances manquantes. Installation...
    pip install -r requirements.txt
)

REM Créer les dossiers s'ils n'existent pas
if not exist "data" mkdir data
if not exist "static" mkdir static
if not exist "logs" mkdir logs

echo.
echo Demarrage du serveur...
echo Interface web: http://localhost:8050
echo Serveur MCP: http://localhost:8050/mcp/
echo Documentation: http://localhost:8050/docs
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

REM Lancer le serveur
python server.py
