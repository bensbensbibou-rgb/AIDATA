@echo off
echo ========================================
echo MCP INSPECTOR - BACnet MCP
echo ========================================

echo.
echo Démarrage du MCP Inspector...
echo.
echo Une fois lancé, ouvrez votre navigateur sur: http://localhost:6274
echo.
echo Pour tester le serveur BACnet MCP:
echo 1. Cliquez sur "Add Server"
echo 2. Entrez l'URL: http://localhost:8050/mcp/
echo 3. Cliquez sur "Connect"
echo 4. Testez les outils BACnet disponibles
echo.

REM Démarrer MCP Inspector
npx @modelcontextprotocol/inspector@0.13.0 --port 6274

pause

