@echo off
echo ========================================
echo   Activation de la virtualisation
echo   pour Docker Desktop
echo ========================================
echo.
echo ATTENTION : Ce script doit etre execute
echo en tant qu'ADMINISTRATEUR !
echo.
pause

echo.
echo [1/4] Verification des privileges administrateur...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privileges administrateur detectes
) else (
    echo [ERREUR] Ce script doit etre execute en tant qu'administrateur !
    echo.
    echo Faites un clic droit sur le fichier et selectionnez
    echo "Executer en tant qu'administrateur"
    pause
    exit /b 1
)

echo.
echo [2/4] Activation de Hyper-V...
dism.exe /online /enable-feature /featurename:Microsoft-Hyper-V-All /all /norestart
if %errorLevel% == 0 (
    echo [OK] Hyper-V active
) else (
    echo [ATTENTION] Erreur lors de l'activation de Hyper-V
)

echo.
echo [3/4] Activation de WSL (Windows Subsystem for Linux)...
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
if %errorLevel% == 0 (
    echo [OK] WSL active
) else (
    echo [ATTENTION] Erreur lors de l'activation de WSL
)

echo.
echo [4/4] Activation de Virtual Machine Platform...
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
if %errorLevel% == 0 (
    echo [OK] Virtual Machine Platform active
) else (
    echo [ATTENTION] Erreur lors de l'activation de Virtual Machine Platform
)

echo.
echo ========================================
echo   Configuration terminee !
echo ========================================
echo.
echo PROCHAINES ETAPES :
echo.
echo 1. Redemarrez votre PC
echo 2. Entrez dans le BIOS (F2, F10, ou Del au demarrage)
echo 3. Activez "Intel VT-x" ou "AMD-V"
echo 4. Sauvegardez et redemarrez (F10)
echo 5. Relancez Docker Desktop
echo.
echo Voulez-vous redemarrer maintenant ? (O/N)
set /p reboot="> "

if /i "%reboot%"=="O" (
    echo Redemarrage dans 10 secondes...
    shutdown /r /t 10
) else (
    echo.
    echo N'oubliez pas de redemarrer votre PC manuellement !
    pause
)
