@echo off
REM gacp.bat — one-shot: add -> commit -> push
set MSG=%*
if "%MSG%"=="" set MSG=auto: save
git add -A
git commit -m "%MSG%"
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set BR=%%i
if "%BR%"=="" set BR=main
git push origin %BR%
