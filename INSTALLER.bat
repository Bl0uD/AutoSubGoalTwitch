@echo off
REM ===================================================================
REM  INSTALLEUR - AutoSubGoalTwitch v2.2.1
REM ===================================================================

echo.
echo ===================================================================
echo      INSTALLEUR AUTOSUBGOALTWITCH v2.2.1
echo ===================================================================
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