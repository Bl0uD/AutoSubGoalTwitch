@echo off
REM ===================================================================
REM  INSTALLEUR - AutoSubGoalTwitch v2.3.0
REM ===================================================================

REM Vérification des droits administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ===================================================================
    echo      DROITS ADMINISTRATEUR REQUIS
    echo ===================================================================
    echo.
    echo Ce script doit etre lance en tant qu'administrateur.
    echo.
    echo Cliquez droit sur INSTALLER.bat et selectionnez:
    echo "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo      INSTALLEUR AUTOSUBGOALTWITCH v2.3.0
echo ===================================================================
echo.
echo [OK] Droits administrateur confirmes
echo.
echo Demarrage de l'installation...
echo.

REM Lancer le script PowerShell d'installation
powershell.exe -ExecutionPolicy Bypass -File "%~dp0app\scripts\INSTALLER.ps1"

IF ERRORLEVEL 1 (
    echo.
    echo [ERREUR] L'installation a rencontre des problemes
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Documentation complete: README.md
echo [OK] Installation terminee
echo.
pause
exit /b 0