@echo off
echo ========================================
echo TEST RAPIDE CONNEXION MCP
echo ========================================

echo.
echo Test 1: Verification serveur MCP...
curl -s -X GET "http://localhost:8050/mcp/" -H "Accept: text/event-stream" >nul
if %errorlevel% equ 0 (
    echo ✅ Serveur MCP accessible sur http://localhost:8050/mcp/
) else (
    echo ❌ Serveur MCP non accessible
)

echo.
echo Test 2: Verification n8n...
curl -s "http://localhost:5678/" >nul
if %errorlevel% equ 0 (
    echo ✅ n8n accessible sur http://localhost:5678
) else (
    echo ❌ n8n non accessible
)

echo.
echo ========================================
echo INSTRUCTIONS CORRECTION N8N
echo ========================================
echo.
echo 1. Ouvrez: http://localhost:5678
echo 2. Trouvez votre workflow avec le noeud "MCP Client2"
echo 3. Double-cliquez sur le noeud MCP Client2
echo 4. Dans "Server URL": http://localhost:8050/mcp/
echo 5. Cliquez sur "Test Connection"
echo 6. Si OK: Sauvegardez et testez votre workflow
echo.
echo Si le test échoue:
echo - Supprimez le noeud et créez-en un nouveau
echo - Redémarrez n8n: Ctrl+C puis .\start_n8n_final.bat
echo.

pause


