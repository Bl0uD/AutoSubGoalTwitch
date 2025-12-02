@echo off
echo.
echo SubCount Auto - Demarrage automatique v2.3.0
echo.

REM Verifier si Node.js est installe
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe ou pas dans le PATH
    echo Telechargez Node.js depuis: https://nodejs.org
    pause
    exit /b 1
)

REM Aller dans le dossier racine du projet (2 niveaux au-dessus)
cd /d "%~dp0..\.."

echo Dossier projet: %CD%
echo.

REM Aller dans le dossier app/server
cd app\server

REM Verifier si les dependances sont installees
if not exist "node_modules" (
    echo Installation des dependances...
    npm install
    if errorlevel 1 (
        echo Erreur installation des dependances
        pause
        exit /b 1
    )
    echo.
)

echo Demarrage du serveur SubCount Auto...
echo.
echo Interface web: http://localhost:8082
echo WebSocket OBS: ws://localhost:8083
echo.
echo Fermez cette fenetre pour arreter le serveur
echo.

REM Demarrer le serveur
node server.js

echo.
echo Serveur arrete
pause
