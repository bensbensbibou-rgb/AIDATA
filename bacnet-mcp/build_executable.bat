@echo off
echo ========================================
echo CREATION EXECUTABLE BACnet MCP
echo ========================================

echo.
echo Installation de PyInstaller...
pip install pyinstaller

echo.
echo Creation de l'executable...
pyinstaller --onefile --name="BACnet_MCP_Installer" --add-data="installer.bat;." --add-data="start_all_with_web_interface.bat;." --add-data="start_n8n_local.bat;." --add-data="start.bat;." --add-data="serveurWeb.py;." --add-data="server.py;." --add-data="n8n.env;." --add-data="config.env.example;." --add-data="requirements.txt;." installer.bat

echo.
echo ========================================
echo EXECUTABLE CREE AVEC SUCCES!
echo ========================================
echo.
echo Fichier: dist\BACnet_MCP_Installer.exe
echo.
echo Pour distribuer:
echo 1. Copiez le fichier .exe
echo 2. Partagez-le avec les utilisateurs
echo 3. Ils peuvent l'executer directement
echo.
pause
