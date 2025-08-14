@echo off
REM scripts\clean-old-import.bat
REM Run from project root
setlocal enabledelayedexpansion
echo [clean-import] Starting cleanup...
node -v >NUL 2>&1 || (echo Node.js is required & exit /b 1)
node scripts\clean-old-import.js %*
IF ERRORLEVEL 1 (echo [clean-import] node script failed & exit /b 1)
echo [clean-import] Uninstalling legacy packages...
npm uninstall xlsx read-excel-file papaparse csv-parse react-dropzone --save
echo [clean-import] Reinstall to refresh lockfile...
npm install
echo [clean-import] Done. You can now commit changes.
