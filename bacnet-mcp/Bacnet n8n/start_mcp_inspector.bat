@echo off
echo ========================================
echo    Démarrage de MCP Inspector
echo ========================================
echo.

echo [1/1] Démarrage de MCP Inspector...
echo.
echo MCP Inspector sera accessible sur : http://localhost:6274
echo.
echo Appuyez sur Ctrl+C pour arrêter
echo.

set HOST=0.0.0.0 && set PORT=6274 && npx @modelcontextprotocol/inspector@0.13.0
