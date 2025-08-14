@echo off
REM Видалення окремого HTML-редактора та очищення маршрутів

setlocal ENABLEDELAYEDEXPANSION

REM 1) Видалити файли, якщо існують
for %%F in (
  "src\pages\AdminHtmlEditor.jsx"
  "src\components\HtmlEditor.jsx"
) do (
  if exist %%F (
    del /f /q %%F
    echo [INFO] Deleted %%F
  )
)

REM 2) Прибрати імпорт/маршрут з App.jsx (якщо є)
set APP=src\App.jsx
if exist "%APP%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content '%APP%') -replace '.*AdminHtmlEditor.*\r?\n','' -replace '.*\"/admin/html-editor\".*\r?\n','' | Set-Content '%APP%'"
  echo [INFO] Cleaned AdminHtmlEditor import/route in App.jsx (if existed)
)

REM 3) Прибрати плитку з Admin.jsx (якщо додавалася)
set ADMIN=src\pages\Admin.jsx
if exist "%ADMIN%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content '%ADMIN%') -replace '.*HTML-редактор.*\r?\n','' | Set-Content '%ADMIN%'"
  echo [INFO] Cleaned HTML-редактор tile in Admin.jsx (if existed)
)

REM 4) Застейджити, коміт і пуш
git add -A
git commit -m "chore: remove standalone HTML editor page and keep inline HTML editing in AdminProducts"
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set BR=%%i
if "%BR%"=="" set BR=main
git push origin %BR%

echo [DONE] Standalone editor removed and changes pushed.
pause
