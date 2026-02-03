@echo off
echo ========================================
echo Configuration utilisateur n8n
echo ========================================

set N8N_USER_FOLDER=C:\Users\naine\bacnet-mcp-venv\n8n-data
set N8N_ENCRYPTION_KEY=cleTresLongueEtAleatoirePourN8n_32caracteres

echo Configuration:
echo - Email: mr-bensalem@hotmail.com
echo - Mot de passe: Bensalem01!
echo - Dossier: %N8N_USER_FOLDER%
echo.

echo Demarrage de n8n pour configuration...
echo.
echo IMPORTANT: Une fois n8n ouvert:
echo 1. Allez sur http://localhost:5678
echo 2. Cliquez sur "Get started"
echo 3. Entrez vos identifiants:
echo    - Email: mr-bensalem@hotmail.com
echo    - Mot de passe: Bensalem01!
echo 4. Vos workflows et credentials seront disponibles
echo.

n8n start --port 5678 --user-folder "%N8N_USER_FOLDER%"

pause
