@echo off
echo ======================================
echo   Demarrage de n8n
echo ======================================
echo.

REM Configuration des variables d'environnement
set N8N_BASIC_AUTH_ACTIVE=true
set N8N_BASIC_AUTH_USER=admin
set N8N_BASIC_AUTH_PASSWORD=admin123
set N8N_HOST=localhost
set N8N_PORT=5678
set GENERIC_TIMEZONE=Europe/Paris

echo Configuration appliquee
echo.
echo ======================================
echo   Informations de connexion :
echo   URL:          http://localhost:5678
echo   Utilisateur:  admin
echo   Mot de passe: admin123
echo ======================================
echo.
echo Demarrage de n8n...
echo Appuyez sur Ctrl+C pour arreter
echo.

n8n start
