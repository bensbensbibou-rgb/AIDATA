@echo off
echo ========================================
echo TEST CONNEXION N8N - MCP SERVER
echo ========================================

echo.
echo [1/3] Test serveur MCP...
curl -s -X GET "http://localhost:8050/mcp/" -H "Accept: text/event-stream" >nul
if %errorlevel% equ 0 (
    echo ✅ Serveur MCP accessible sur http://localhost:8050/mcp/
) else (
    echo ❌ Serveur MCP non accessible
    goto :error
)

echo.
echo [2/3] Test n8n...
curl -s "http://localhost:5678/" >nul
if %errorlevel% equ 0 (
    echo ✅ n8n accessible sur http://localhost:5678
) else (
    echo ❌ n8n non accessible
    goto :error
)

echo.
echo [3/3] Test connexion MCP depuis n8n...
curl -s -X POST "http://localhost:8050/mcp/" -H "Content-Type: application/json" -H "Accept: text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"n8n-test\",\"version\":\"1.0.0\"}}}" >nul
if %errorlevel% equ 0 (
    echo ✅ Connexion MCP fonctionnelle
) else (
    echo ❌ Erreur de connexion MCP
    goto :error
)

echo.
echo ========================================
echo ✅ TOUS LES TESTS REUSSIS!
echo ========================================
echo.
echo Configuration n8n MCP Client:
echo - Server URL: http://localhost:8050/mcp/
echo - Headers: Accept: application/json, text/event-stream
echo - Content-Type: application/json
echo.
echo Si le nœud MCP dans n8n ne fonctionne toujours pas:
echo 1. Supprimez le nœud MCP Client2
echo 2. Ajoutez un nouveau nœud MCP Client
echo 3. Configurez avec l'URL ci-dessus
echo 4. Testez la connexion
echo.
goto :end

:error
echo.
echo ========================================
echo ❌ ERREUR DETECTEE
echo ========================================
echo.
echo Solutions possibles:
echo 1. Redémarrez les services: .\stop_all_services.bat puis .\start_all_automatic.bat
echo 2. Vérifiez les logs: docker logs bacnet-mcp-server
echo 3. Vérifiez les logs n8n: docker logs n8n-automation
echo.

:end
pause
