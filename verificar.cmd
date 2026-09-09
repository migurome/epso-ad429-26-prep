@echo off
setlocal

rem Lanzador de la verificacion completa, pensado para doble clic desde el
rem Explorador.
rem
rem Existe porque PowerShell puede tener deshabilitada la ejecucion de scripts
rem (SecurityError sobre npm.ps1) y entonces "npm run verify" no arranca. Este
rem archivo llama a node.exe directamente, que es un ejecutable y al que no le
rem afecta la politica de ejecucion.
rem
rem Desde una terminal admite los mismos argumentos que el script, y
rem --no-pause para que no se quede esperando al final:
rem
rem   verificar.cmd --only=unit --no-pause

chcp 65001 >nul
cd /d "%~dp0platform"

rem --no-pause se retira de los argumentos; el resto va tal cual a node. Se
rem hace por sustitucion de cadena y no con un bucle FOR, porque FOR trata el
rem "=" de "--only=unit" como separador y partiria el argumento en dos.
set "ARGS=%*"
set "PAUSE_AT_END=1"
if not "%ARGS%"=="%ARGS:--no-pause=%" set "PAUSE_AT_END="
set "ARGS=%ARGS:--no-pause=%"

node scripts\verify.mjs %ARGS%
set "EXITCODE=%ERRORLEVEL%"

echo.
if "%EXITCODE%"=="0" (
  echo Verificacion superada.
) else (
  echo La verificacion ha encontrado problemas. El detalle esta mas arriba.
)

if defined PAUSE_AT_END pause

exit /b %EXITCODE%
