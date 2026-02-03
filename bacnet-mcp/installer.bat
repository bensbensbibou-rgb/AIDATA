@echo off
setlocal enabledelayedexpansion

echo ========================================
echo INSTALLATEUR BACnet MCP + n8n + Web
echo ========================================
echo.
echo Cet installateur va:
echo 1. Verifier/Installer Python 3.11+
echo 2. Verifier/Installer Node.js 18+
echo 3. Verifier/Installer Docker Desktop
echo 4. Installer les dependances Python
echo 5. Configurer l'environnement
echo 6. Preparer les services
echo.

set /p confirm="Voulez-vous continuer? (o/n): "
if /i not "%confirm%"=="o" (
    echo Installation annulee.
    pause
    exit /b 0
)

echo.
echo ========================================
echo 1. VERIFICATION PYTHON
echo ========================================

python --version >nul 2>&1
if errorlevel 1 (
    echo Python n'est pas installe.
    echo Telechargement de Python 3.11...
    echo Veuillez installer Python 3.11+ depuis https://python.org
    echo Assurez-vous de cocher "Add Python to PATH"
    echo.
    start https://www.python.org/downloads/
    pause
    echo.
    echo Apres installation, relancez cet installateur.
    pause
    exit /b 1
) else (
    echo Python est installe.
    python --version
)

echo.
echo ========================================
echo 2. VERIFICATION NODE.JS
echo ========================================

node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe.
    echo Telechargement de Node.js 18+...
    echo Veuillez installer Node.js 18+ depuis https://nodejs.org
    echo.
    start https://nodejs.org/
    pause
    echo.
    echo Apres installation, relancez cet installateur.
    pause
    exit /b 1
) else (
    echo Node.js est installe.
    node --version
)

echo.
echo ========================================
echo 3. VERIFICATION DOCKER
echo ========================================

docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker n'est pas installe.
    echo Telechargement de Docker Desktop...
    echo Veuillez installer Docker Desktop depuis https://docker.com
    echo.
    start https://www.docker.com/products/docker-desktop/
    pause
    echo.
    echo Apres installation, relancez cet installateur.
    pause
    exit /b 1
) else (
    echo Docker est installe.
    docker --version
)

echo.
echo ========================================
echo 4. CREATION DE L'ENVIRONNEMENT VIRTUEL
echo ========================================

if not exist "venv" (
    echo Creation de l'environnement virtuel Python...
    python -m venv venv
    echo Environnement virtuel cree.
) else (
    echo Environnement virtuel deja present.
)

echo.
echo ========================================
echo 5. INSTALLATION DES DEPENDANCES PYTHON
echo ========================================

echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

echo Mise a jour de pip...
python -m pip install --upgrade pip

echo Installation des dependances...
pip install -r requirements.txt

echo.
echo ========================================
echo 6. INSTALLATION N8N
echo ========================================

echo Installation de n8n globalement...
npm install -g n8n

echo.
echo ========================================
echo 7. CREATION DES DOSSIERS
echo ========================================

if not exist "data" mkdir data
if not exist "static" mkdir static
if not exist "logs" mkdir logs
if not exist "n8n-data" mkdir n8n-data
if not exist "monitoring" mkdir monitoring
if not exist "monitoring\prometheus" mkdir monitoring\prometheus
if not exist "monitoring\grafana" mkdir monitoring\grafana
if not exist "monitoring\nginx" mkdir monitoring\nginx

echo Dossiers crees.

echo.
echo ========================================
echo 8. CONFIGURATION DES FICHIERS
echo ========================================

if not exist ".env" (
    echo Copie du fichier de configuration...
    copy "config.env.example" ".env" >nul 2>&1
    echo Fichier .env cree.
)

echo.
echo ========================================
echo 9. VERIFICATION DES SERVICES
echo ========================================

echo Test de Python...
python -c "import fastapi, uvicorn, pydantic; print('Python OK')"

echo Test de Node.js...
node -e "console.log('Node.js OK')"

echo Test de Docker...
docker --version

echo.
echo ========================================
echo INSTALLATION TERMINEE AVEC SUCCES!
echo ========================================
echo.
echo Services disponibles:
echo - Serveur BACnet MCP: http://localhost:8050
echo - Interface n8n: http://localhost:5678
echo - Interface Web: http://localhost:8080
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3000
echo.
echo Scripts de demarrage:
echo - start_all_with_web_interface.bat (tous les services)
echo - start_n8n_local.bat (n8n seul)
echo - start.bat (BACnet MCP seul)
echo.
echo Appuyez sur une touche pour fermer...
pause
