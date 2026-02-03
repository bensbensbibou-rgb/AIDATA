@echo off
echo ========================================
echo DEMARRAGE N8N AVEC CONFIGURATION
echo ========================================

REM Vérifier si le fichier de configuration existe
if not exist ".n8nrc" (
    echo ❌ Fichier .n8nrc non trouve
    pause
    exit /b 1
)

echo.
echo Configuration detectee dans .n8nrc
echo Demarrage de n8n avec la configuration...

REM Démarrer n8n avec le fichier de configuration
start "n8n avec config" cmd /k "n8n start --config .n8nrc"

echo.
echo ========================================
echo N8N DEMARRE AVEC CONFIGURATION!
echo ========================================
echo.
echo URL: http://localhost:5678
echo Utilisateur: admin
echo Mot de passe: Admin123
echo.
echo Configuration MCP:
echo - Server URL: http://localhost:8050/mcp/
echo.
pause
