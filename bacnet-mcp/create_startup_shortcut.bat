@echo off
echo ========================================
echo CREATION DU DEMARRAGE AUTOMATIQUE
echo BACnet MCP + n8n + Web + MCP Inspector
echo ========================================

echo.
echo Ce script va creer un raccourci dans le dossier de demarrage Windows
echo pour que tous les services se lancent automatiquement au demarrage.
echo.

set /p confirm="Voulez-vous continuer? (o/n): "
if /i not "%confirm%"=="o" (
    echo Operation annulee.
    pause
    exit /b 0
)

echo.
echo [1/3] Creation du raccourci...

REM Chemin du dossier de démarrage
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

REM Chemin complet du script de démarrage
set SCRIPT_PATH=%cd%\start_all_automatic.bat

REM Créer le raccourci VBS
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_shortcut.vbs"
echo sLinkFile = "%STARTUP_FOLDER%\BACnet_MCP_AutoStart.lnk" >> "%TEMP%\create_shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\create_shortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_PATH%" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WorkingDirectory = "%cd%" >> "%TEMP%\create_shortcut.vbs"
echo oLink.Description = "Demarrage automatique BACnet MCP + n8n + Web" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\create_shortcut.vbs"
echo oLink.Save >> "%TEMP%\create_shortcut.vbs"

REM Exécuter le script VBS
cscript //nologo "%TEMP%\create_shortcut.vbs"

echo ✅ Raccourci cree dans le dossier de demarrage.

echo.
echo [2/3] Verification du raccourci...
if exist "%STARTUP_FOLDER%\BACnet_MCP_AutoStart.lnk" (
    echo ✅ Raccourci verifie avec succes.
) else (
    echo ❌ Erreur lors de la creation du raccourci.
    pause
    exit /b 1
)

echo.
echo [3/3] Nettoyage...
del "%TEMP%\create_shortcut.vbs" 2>nul

echo.
echo ========================================
echo DEMARRAGE AUTOMATIQUE CONFIGURE!
echo ========================================
echo.
echo ✅ Le raccourci a ete cree avec succes.
echo.
echo 📁 Emplacement: %STARTUP_FOLDER%\BACnet_MCP_AutoStart.lnk
echo.
echo 🔄 Au prochain demarrage de Windows, tous les services se lanceront automatiquement:
echo    - Serveur BACnet MCP
echo    - Interface Web
echo    - n8n
echo    - MCP Inspector
echo    - Prometheus, Grafana, Nginx
echo.
echo ⚠️  Note: Le demarrage peut prendre quelques minutes.
echo.
echo Pour desactiver le demarrage automatique:
echo 1. Appuyez sur Win+R
echo 2. Tapez: shell:startup
echo 3. Supprimez le fichier BACnet_MCP_AutoStart.lnk
echo.
pause
