@echo off
REM ============================================
REM One-click YML/XML import via Supabase Edge
REM ============================================

REM >>> SET THESE IF YOU NEED TO CHANGE <<<
set "SB_URL=https://oqfrhvgzwstoxabttqno.supabase.co"
set "IMPORT_SECRET=123321"
set "FEED_URL=https://www.shopeditor.com.ua/se_files/dropostore3EE755DD3639.xml"

echo.
echo Importing from: %FEED_URL%
echo Using Supabase: %SB_URL%
echo --------------------------------------------
echo Sending request...

curl -X POST ^
  -H "Content-Type: application/json" ^
  -H "X-Import-Token: %IMPORT_SECRET%" ^
  -d "{\"url\":\"%FEED_URL%\"}" ^
  "%SB_URL%/functions/v1/import_yml"

echo.
echo --------------------------------------------
echo If you see JSON with "ok": true, the import ran successfully.
echo Press any key to close...
pause >nul
